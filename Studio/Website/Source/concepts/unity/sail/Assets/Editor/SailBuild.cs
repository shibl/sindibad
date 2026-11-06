using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

// Builds the whole project from scratch in batch mode: project settings, materials, the scene, and the WebGL player.
//   Unity -batchmode -quit -projectPath . -buildTarget WebGL -executeMethod SailBuild.All
public static class SailBuild
{
    const string ART = "Assets/Art/", TEX = "Assets/Art/Textures/", MAT = "Assets/Art/Materials/", SET = "Assets/Settings/", SND = "Assets/Audio/";
    static readonly Quaternion Base = Quaternion.Euler(0, 180, 0);

    public static void All()
    {
        Setup();
        Scene();
        WebGL();
    }

    public static void SceneAndShots()
    {
        Setup();
        Scene();
        Shots();
    }

    // ------------------------------------------------------------------------------------------------ settings
    public static void Setup()
    {
        Directory.CreateDirectory(MAT);
        Directory.CreateDirectory(SET);
        Directory.CreateDirectory("Assets/Scenes");

        PlayerSettings.companyName = "Sindibad Studios";
        PlayerSettings.productName = "Set sail";
        PlayerSettings.colorSpace = ColorSpace.Linear;
        PlayerSettings.runInBackground = true;
        PlayerSettings.SplashScreen.show = false;
        PlayerSettings.SplashScreen.showUnityLogo = false;
        PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.WebGL, false);
        PlayerSettings.SetGraphicsAPIs(BuildTarget.WebGL, new[] { GraphicsDeviceType.OpenGLES3 });
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Brotli;
        PlayerSettings.WebGL.decompressionFallback = true;
        PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.None;
        PlayerSettings.WebGL.dataCaching = true;
        PlayerSettings.WebGL.template = "PROJECT:Sail";
        PlayerSettings.WebGL.linkerTarget = WebGLLinkerTarget.Wasm;
        PlayerSettings.WebGL.threadsSupport = false;
        PlayerSettings.WebGL.debugSymbolMode = Environment.GetEnvironmentVariable("SAIL_DEV") == "1" ? WebGLDebugSymbolMode.Embedded : WebGLDebugSymbolMode.Off;
        PlayerSettings.WebGL.nameFilesAsHashes = false;
        PlayerSettings.WebGL.initialMemorySize = 128;
        PlayerSettings.WebGL.maximumMemorySize = 1024;
        PlayerSettings.stripEngineCode = true;
        PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.WebGL, ManagedStrippingLevel.High);

        // The old input manager is all this needs, and needs no extra package.
        var ps = new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/ProjectSettings.asset")[0]);
        var ih = ps.FindProperty("activeInputHandler");
        if (ih != null) { ih.intValue = 0; ps.ApplyModifiedPropertiesWithoutUndo(); }
        AssetDatabase.SaveAssets();

        Pipeline();
        Imports();
    }

    static void SetProp(SerializedObject so, string name, Action<SerializedProperty> f)
    {
        var p = so.FindProperty(name);
        if (p == null) { Debug.LogWarning("SAIL no property " + name); return; }
        f(p);
    }

    static void Pipeline()
    {
        const string rdPath = SET + "SailRenderer.asset", aPath = SET + "SailURP.asset";
        var rd = AssetDatabase.LoadAssetAtPath<UniversalRendererData>(rdPath);
        if (rd == null)
        {
            rd = ScriptableObject.CreateInstance<UniversalRendererData>();
            AssetDatabase.CreateAsset(rd, rdPath);
        }
        var asset = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(aPath);
        if (asset == null)
        {
            asset = UniversalRenderPipelineAsset.Create(rd);
            AssetDatabase.CreateAsset(asset, aPath);
        }
        asset.msaaSampleCount = 4;
        asset.supportsHDR = true;
        asset.renderScale = 1f;
        asset.shadowDistance = 270f;
        asset.shadowCascadeCount = 2;
        asset.cascade2Split = 0.2f;
        asset.shadowDepthBias = 1.0f;
        asset.shadowNormalBias = 0.8f;
        var so = new SerializedObject(asset);
        SetProp(so, "m_MainLightShadowmapResolution", p => p.intValue = 2048);
        SetProp(so, "m_MainLightShadowsSupported", p => p.boolValue = true);
        SetProp(so, "m_SoftShadowsSupported", p => p.boolValue = true);
        SetProp(so, "m_AdditionalLightsRenderingMode", p => p.intValue = 0);
        SetProp(so, "m_AdditionalLightShadowsSupported", p => p.boolValue = false);
        SetProp(so, "m_RequireDepthTexture", p => p.boolValue = false);
        SetProp(so, "m_RequireOpaqueTexture", p => p.boolValue = false);
        SetProp(so, "m_ColorGradingMode", p => p.intValue = 1);
        SetProp(so, "m_HDRColorBufferPrecision", p => p.intValue = 0);
        SetProp(so, "m_SupportsLightLayers", p => p.boolValue = false);
        so.ApplyModifiedPropertiesWithoutUndo();
        EditorUtility.SetDirty(asset);
        EditorUtility.SetDirty(rd);
        GraphicsSettings.defaultRenderPipeline = asset;
        for (int i = 0; i < QualitySettings.names.Length; i++)
        {
            QualitySettings.SetQualityLevel(i, false);
            QualitySettings.renderPipeline = asset;
        }
        QualitySettings.SetQualityLevel(QualitySettings.names.Length - 1, true);
        QualitySettings.vSyncCount = 1;
        AssetDatabase.SaveAssets();
    }

    static void Tex(string file, bool normal = false, bool srgb = false, int max = 1024, bool crunch = true, int quality = 60, TextureWrapMode wrap = TextureWrapMode.Repeat, bool alpha = false, bool mips = true)
    {
        var path = TEX + file + ".png";
        var ti = (TextureImporter)AssetImporter.GetAtPath(path);
        if (ti == null) { Debug.LogError("SAIL missing " + path); return; }
        ti.textureType = normal ? TextureImporterType.NormalMap : TextureImporterType.Default;
        ti.sRGBTexture = srgb && !normal;
        ti.mipmapEnabled = mips;
        ti.maxTextureSize = max;
        ti.wrapMode = wrap;
        ti.anisoLevel = 4;
        ti.alphaIsTransparency = false;
        ti.alphaSource = alpha ? TextureImporterAlphaSource.FromInput : TextureImporterAlphaSource.None;
        ti.crunchedCompression = crunch;
        ti.compressionQuality = quality;
        ti.textureCompression = TextureImporterCompression.CompressedHQ;
        ti.npotScale = TextureImporterNPOTScale.None;
        ti.SaveAndReimport();
    }

    static void Imports()
    {
        // Three unrelated channels, which block compression would smear into each other. Uncompressed, in both the DXT and the ASTC build.
        Tex("clouds", max: 2048, crunch: false, wrap: TextureWrapMode.Repeat);
        var c = (TextureImporter)AssetImporter.GetAtPath(TEX + "clouds.png");
        c.wrapModeU = TextureWrapMode.Repeat;
        c.wrapModeV = TextureWrapMode.Clamp;
        c.anisoLevel = 2;
        c.textureCompression = TextureImporterCompression.Uncompressed;
        c.SetPlatformTextureSettings(new TextureImporterPlatformSettings { name = "WebGL", overridden = true, format = TextureImporterFormat.RGB24, maxTextureSize = 2048, textureCompression = TextureImporterCompression.Uncompressed });
        c.SaveAndReimport();
        Tex("sea_n", normal: true, max: 512, crunch: true, quality: 85);
        Tex("sea_d", normal: true, max: 256, crunch: false);
        Tex("foam", max: 512, crunch: true, quality: 70);
        Tex("plank", max: 256, crunch: true, quality: 70);
        Tex("soft", max: 128, crunch: false, wrap: TextureWrapMode.Clamp, alpha: true);
        Tex("spray", max: 128, crunch: false, wrap: TextureWrapMode.Clamp, alpha: true);
        Tex("petal", max: 64, crunch: false, wrap: TextureWrapMode.Clamp, alpha: true);
        Tex("shore", max: 1024, crunch: false, wrap: TextureWrapMode.Clamp, mips: false);
        var s = (TextureImporter)AssetImporter.GetAtPath(TEX + "shore.png");
        s.isReadable = true;
        s.anisoLevel = 1;
        s.textureCompression = TextureImporterCompression.Uncompressed;
        var pf = new TextureImporterPlatformSettings { name = "WebGL", overridden = true, format = TextureImporterFormat.R8, maxTextureSize = 1024, textureCompression = TextureImporterCompression.Uncompressed };
        s.SetPlatformTextureSettings(pf);
        s.SaveAndReimport();

        var m = (ModelImporter)AssetImporter.GetAtPath(ART + "world.fbx");
        m.materialImportMode = ModelImporterMaterialImportMode.None;
        m.importNormals = ModelImporterNormals.Import;
        m.importTangents = ModelImporterTangents.None;
        m.importAnimation = false;
        m.importCameras = false;
        m.importLights = false;
        m.importBlendShapes = false;
        m.animationType = ModelImporterAnimationType.None;
        m.meshCompression = ModelImporterMeshCompression.Medium;
        m.isReadable = false;
        m.SaveAndReimport();

        foreach (var wav in Directory.GetFiles("Assets/Audio", "*.wav"))
        {
            var ai = (AudioImporter)AssetImporter.GetAtPath(wav.Replace('\\', '/'));
            var st = ai.defaultSampleSettings;
            // Compressed sound is the one thing Brotli can't shrink any further. Nothing here has anything to say above 11 kHz.
            st.loadType = AudioClipLoadType.DecompressOnLoad;
            st.compressionFormat = AudioCompressionFormat.Vorbis;
            st.quality = 0.22f;
            st.sampleRateSetting = AudioSampleRateSetting.OverrideSampleRate;
            st.sampleRateOverride = 22050;
            ai.defaultSampleSettings = st;
            ai.SaveAndReimport();
        }
    }

    // ------------------------------------------------------------------------------------------------ materials
    static Dictionary<string, Material> mats = new Dictionary<string, Material>();
    static Texture2D T(string n) => AssetDatabase.LoadAssetAtPath<Texture2D>(TEX + n + ".png");

    static Material Keep(Material m)
    {
        mats[m.name] = m;
        var path = MAT + m.name + ".mat";
        AssetDatabase.DeleteAsset(path);
        AssetDatabase.CreateAsset(m, path);
        return m;
    }

    static Material W(string name, Action<Material> f = null)
    {
        var m = new Material(Shader.Find("Sindibad/World")) { name = name };
        f?.Invoke(m);
        return Keep(m);
    }

    static Material Puff(string name, string tex, float add, float lit, Color tint)
    {
        var m = new Material(Shader.Find("Sindibad/Puff")) { name = name };
        m.SetTexture("_MainTex", T(tex));
        m.SetFloat("_Add", add);
        m.SetFloat("_Lit", lit);
        m.SetColor("_Tint", tint);
        m.renderQueue = (int)RenderQueue.Transparent;
        return Keep(m);
    }

    static void Materials()
    {
        mats.Clear();
        W("world");
        W("ground", m => { m.SetFloat("_Terrain", 1); m.SetTexture("_DetailTex", T("foam")); });
        W("hull", m => { m.SetFloat("_UseDetail", 1); m.SetTexture("_DetailTex", T("plank")); m.SetFloat("_Gloss", 0.06f); });
        W("leaf", m => m.SetFloat("_Leaf", 1));
        W("blossom", m => { m.SetFloat("_Blossom", 1); m.SetFloat("_Leaf", 1); m.SetFloat("_Open", 0); });
        W("flowers", m => { m.SetFloat("_Blossom", 1); m.SetFloat("_Open", 0); });
        W("lamp", m => { m.SetFloat("_Emit", 2.5f); });
        W("boatlamp", m => { m.SetFloat("_Emit", 0.8f); m.SetFloat("_EmitDusk", 0); });
        W("flap", m => { m.SetFloat("_Flap", 0.7f); });
        W("wing", m => m.SetFloat("_Cull", 0));
        W("twoside", m => m.SetFloat("_Cull", 0));
        W("far", m => { m.SetFloat("_Far", 1f); });
        var flag = new Material(Shader.Find("Sindibad/Sail")) { name = "flag" };
        flag.SetFloat("_Flag", 1); flag.SetFloat("_Luff", 1); flag.SetFloat("_Lit", 0.7f);
        flag.SetVector("_UDir", new Vector4(0, 0, 1, 0)); flag.SetVector("_VDir", new Vector4(0, 1, 0, 0));
        Keep(flag);
        var sail = new Material(Shader.Find("Sindibad/Sail")) { name = "sail" };
        sail.SetFloat("_Belly", 3.4f);
        Keep(sail);
        var falls = new Material(Shader.Find("Sindibad/Falls")) { name = "falls" };
        falls.SetTexture("_Foam", T("foam"));
        Keep(falls);
        var sea = new Material(Shader.Find("Sindibad/Sea")) { name = "sea" };
        sea.SetTexture("_N1", T("sea_n"));
        sea.SetTexture("_N2", T("sea_d"));
        sea.SetTexture("_Foam", T("foam"));
        sea.SetTexture("_Shore", T("shore"));
        Keep(sea);
        var wake = new Material(Shader.Find("Sindibad/Wake")) { name = "wake" };
        wake.SetTexture("_Foam", T("foam"));
        Keep(wake);
        var sky = new Material(Shader.Find("Sindibad/Sky")) { name = "sky" };
        Keep(sky);
        var beam = new Material(Shader.Find("Sindibad/Beam")) { name = "beam" };
        beam.SetColor("_Color", new Color(1, 0.88f, 0.62f, 0.5f)); beam.SetFloat("_Soft", 3.6f); beam.SetFloat("_Len", 1.3f);
        Keep(beam);
        var shaft = new Material(Shader.Find("Sindibad/Beam")) { name = "shaft" };
        shaft.SetColor("_Color", new Color(1f, 0.78f, 0.5f, 0f)); shaft.SetFloat("_Soft", 3.2f); shaft.SetFloat("_Len", 0.5f);
        Keep(shaft);
        var rope = new Material(Shader.Find("Sindibad/World")) { name = "rope" };
        rope.SetColor("_Tint", new Color(0.42f, 0.32f, 0.2f));
        Keep(rope);
        Puff("spray", "spray", 0f, 1f, new Color(1, 1, 1, 0.85f));
        Puff("churn", "spray", 0f, 1f, new Color(1, 1, 1, 0.6f));
        Puff("petal", "petal", 0f, 0.5f, new Color(1f, 0.55f, 0.72f, 1f));
        Puff("spark", "soft", 0.55f, 0f, Color.white);
        Puff("lantern", "soft", 1f, 0f, Color.white);
        foreach (var m in mats.Values) EditorUtility.SetDirty(m);
        AssetDatabase.SaveAssets();
    }

    // ------------------------------------------------------------------------------------------------ the scene
    static Dictionary<string, Transform> nodes;

    [Serializable] class Layout
    {
        public float[] beautiful, research, play, lamp, kites, bell, pivot, clew, peak, mastTop, wheel, dome;
    }

    // Blender (X east, Y north, Z up) to the world here (X east, Y up, Z north).
    static Vector3 V(float[] a, int i = 0) => new Vector3(a[i], a[i + 2], a[i + 1]);

    // Places a node from the FBX. Moving parts keep their own pivot, and the rest sit at the origin of `parent`.
    static GameObject Part(string node, Transform parent, Vector3? local = null, bool shadow = true, int layer = SailGame.ReflectLayer, string mat = null)
    {
        if (!nodes.TryGetValue(node, out var n)) { Debug.LogError("SAIL no node " + node); return new GameObject(node); }
        var mf = n.GetComponent<MeshFilter>();
        var go = new GameObject(node.Split(new[] { "__" }, StringSplitOptions.None)[0]) { layer = layer };
        go.transform.SetParent(parent, false);
        go.transform.localPosition = local ?? (Base * n.localPosition);
        go.transform.localRotation = Base;
        go.AddComponent<MeshFilter>().sharedMesh = mf.sharedMesh;
        var mr = go.AddComponent<MeshRenderer>();
        var key = mat ?? node.Split(new[] { "__" }, StringSplitOptions.None)[1];
        if (!mats.TryGetValue(key, out var m)) Debug.LogError("SAIL no material " + key);
        mr.sharedMaterial = m;
        mr.shadowCastingMode = shadow ? ShadowCastingMode.On : ShadowCastingMode.Off;
        mr.receiveShadows = true;
        mr.lightProbeUsage = LightProbeUsage.Off;
        mr.reflectionProbeUsage = ReflectionProbeUsage.Off;
        return go;
    }

    static Mesh Cone(string name, float length, float r0, float r1, int sides)
    {
        var path = ART + name + ".asset";
        AssetDatabase.DeleteAsset(path);
        var v = new List<Vector3>(); var n = new List<Vector3>(); var uv = new List<Vector2>(); var c = new List<Color>(); var t = new List<int>();
        int rings = 12;
        for (int i = 0; i <= rings; i++)
        {
            float k = i / (float)rings;
            float r = Mathf.Lerp(r0, r1, k);
            for (int s = 0; s <= sides; s++)
            {
                float a = s / (float)sides * Mathf.PI * 2;
                v.Add(new Vector3(Mathf.Cos(a) * r, Mathf.Sin(a) * r, k * length));
                n.Add(new Vector3(Mathf.Cos(a), Mathf.Sin(a), 0));
                uv.Add(new Vector2(s / (float)sides, k));
                c.Add(new Color(1, 1, 1, Mathf.Clamp01(k * 40f)));
            }
        }
        for (int i = 0; i < rings; i++)
            for (int s = 0; s < sides; s++)
            {
                int a = i * (sides + 1) + s, b = a + 1, d = a + sides + 1, e = d + 1;
                t.AddRange(new[] { a, d, b, b, d, e });
            }
        var m = new Mesh { name = name };
        m.SetVertices(v); m.SetNormals(n); m.SetUVs(0, uv); m.SetColors(c); m.SetTriangles(t, 0);
        m.RecalculateBounds();
        m.bounds = new Bounds(m.bounds.center, m.bounds.size * 1.5f);
        AssetDatabase.CreateAsset(m, path);
        return m;
    }

    static GameObject ConeObject(string name, Mesh mesh, Material mat, Transform parent)
    {
        var go = new GameObject(name) { layer = 0 };
        go.transform.SetParent(parent, false);
        go.AddComponent<MeshFilter>().sharedMesh = mesh;
        var mr = go.AddComponent<MeshRenderer>();
        mr.sharedMaterial = mat;
        mr.shadowCastingMode = ShadowCastingMode.Off;
        mr.receiveShadows = false;
        mr.lightProbeUsage = LightProbeUsage.Off;
        mr.reflectionProbeUsage = ReflectionProbeUsage.Off;
        return go;
    }

    static Transform Rope(string name, Transform parent, Mesh cyl, Color colour)
    {
        var go = new GameObject(name) { layer = SailGame.ReflectLayer };
        go.transform.SetParent(parent, false);
        go.AddComponent<MeshFilter>().sharedMesh = cyl;
        var mr = go.AddComponent<MeshRenderer>();
        mr.sharedMaterial = mats["rope"];
        mr.shadowCastingMode = ShadowCastingMode.Off;
        mr.lightProbeUsage = LightProbeUsage.Off;
        mr.reflectionProbeUsage = ReflectionProbeUsage.Off;
        return go.transform;
    }

    static ParticleSystem Particles(string name, Transform parent, string mat, int max, Action<ParticleSystem> f, int layer = 0)
    {
        var go = new GameObject(name) { layer = layer };
        go.transform.SetParent(parent, false);
        var ps = go.AddComponent<ParticleSystem>();
        ps.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
        var main = ps.main;
        main.playOnAwake = false;
        main.simulationSpace = ParticleSystemSimulationSpace.World;
        main.maxParticles = max;
        main.loop = false;
        var em = ps.emission; em.enabled = false;
        var shape = ps.shape; shape.enabled = false;
        f(ps);
        var r = go.GetComponent<ParticleSystemRenderer>();
        r.sharedMaterial = mats[mat];
        r.shadowCastingMode = ShadowCastingMode.Off;
        r.receiveShadows = false;
        r.lightProbeUsage = LightProbeUsage.Off;
        r.reflectionProbeUsage = ReflectionProbeUsage.Off;
        r.renderMode = ParticleSystemRenderMode.Billboard;
        r.maxParticleSize = 0.03f;
        r.sortMode = ParticleSystemSortMode.None;
        r.alignment = ParticleSystemRenderSpace.View;
        return ps;
    }

    static AnimationCurve Ramp(params float[] kv)
    {
        var c = new AnimationCurve();
        for (int i = 0; i < kv.Length; i += 2) c.AddKey(kv[i], kv[i + 1]);
        return c;
    }

    public static void Scene()
    {
        AssetDatabase.Refresh();
        Materials();
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        var fbx = AssetDatabase.LoadAssetAtPath<GameObject>(ART + "world.fbx");
        nodes = new Dictionary<string, Transform>();
        foreach (var t in fbx.GetComponentsInChildren<Transform>()) nodes[t.name] = t;
        Debug.Log($"SAIL fbx nodes {nodes.Count} root {fbx.transform.localScale}");
        var layout = JsonUtility.FromJson<Layout>(File.ReadAllText(ART + "layout.json"));

        var gameGo = new GameObject("Game");
        var game = gameGo.AddComponent<SailGame>();

        // ---------------- the boat
        var boat = new GameObject("Boat").transform;
        foreach (var n in new[] { "Hull__hull", "Inner__hull", "Trim__world", "Mast__world", "Cargo__world" }) Part(n, boat, Vector3.zero);
        var lamps = Part("Lamps__lamp", boat, Vector3.zero, false, mat: "boatlamp");
        var pivotPos = V(layout.pivot);
        var pivot = new GameObject("YardPivot").transform;
        pivot.SetParent(boat, false);
        pivot.localPosition = pivotPos;
        Part("Yard__world", pivot, Vector3.zero);
        Part("Sail__sail", pivot, Vector3.zero);
        var clew = new GameObject("Clew").transform;
        clew.SetParent(pivot, false);
        clew.localPosition = V(layout.clew);
        var foot = new GameObject("SheetFoot").transform;
        foot.SetParent(boat, false);
        foot.localPosition = new Vector3(0, 4.3f, -8.2f);
        var rudder = Part("Rudder__world", boat, mat: "twoside");
        var pen = Part("Pennant__flag", boat, shadow: false);
        var mastTop = new GameObject("MastTop").transform;
        mastTop.SetParent(boat, false);
        mastTop.localPosition = V(layout.mastTop) + new Vector3(0, 0.3f, 0);
        // A plain cylinder for the sheet and the kite strings. The game stretches it between two points.
        var tmpCyl = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        var cyl = tmpCyl.GetComponent<MeshFilter>().sharedMesh;
        UnityEngine.Object.DestroyImmediate(tmpCyl);
        var sheet = Rope("Sheet", boat, cyl, Color.black);
        sheet.SetParent(null, true);

        // ---------------- the hoopoe
        var birdRoot = new GameObject("Hoopoe").transform;
        Part("BirdBody__world", birdRoot, Vector3.zero);
        var wl = Part("BirdWingL__wing", birdRoot);
        var wr = Part("BirdWingR__wing", birdRoot);
        var tail = Part("BirdTail__wing", birdRoot);
        var crest = Part("BirdCrest__wing", birdRoot);
        birdRoot.localScale = Vector3.one * 2.5f;
        var trailGo = new GameObject("Trail") { layer = 0 };
        trailGo.transform.SetParent(birdRoot, false);
        var trail = trailGo.AddComponent<TrailRenderer>();
        trail.time = 1.6f;
        trail.minVertexDistance = 0.6f;
        trail.startWidth = 0.9f;
        trail.endWidth = 0f;
        trail.sharedMaterial = mats["spark"];
        trail.startColor = new Color(2.6f, 1.9f, 1.0f, 0.65f);
        trail.endColor = new Color(1.9f, 1.3f, 0.7f, 0f);
        trail.shadowCastingMode = ShadowCastingMode.Off;
        trail.receiveShadows = false;
        trail.textureMode = LineTextureMode.Stretch;

        // ---------------- the world
        var world = new GameObject("World").transform;
        foreach (var n in new[] { "Beautiful_ground__world", "Beautiful_leaf__leaf", "Beautiful_trunk__world", "Blossom__blossom", "Falls__falls",
                                  "Research_ground__world", "Research_leaf__leaf", "Research_trunk__world", "Research_build__world",
                                  "Play_ground__world", "Play_leaf__leaf", "Play_trunk__world", "Play_build__world",
                                  "Islets_ground__world", "Islets_leaf__leaf", "Islets_trunk__world" })
            Part(n, world, Vector3.zero, n.Contains("leaf") || n.Contains("ground") || n.Contains("trunk") || n.Contains("build"), mat: n.Contains("_ground") ? "ground" : null);
        Part("Flowers__blossom", world, Vector3.zero, false, mat: "flowers");
        Part("Research_lamp__lamp", world, Vector3.zero, false);
        Part("FarIsles__far", world, Vector3.zero, false);
        var domeL = Part("DomeL__world", world);
        var domeR = Part("DomeR__world", world);
        var tele = Part("Telescope__world", world);
        var wheel = Part("Wheel__world", world);
        var bell = Part("Bell__world", world);
        var gond = Enumerable.Range(0, 8).Select(i => Part($"Gondola{i}__world", world).transform).ToArray();
        var pins = Enumerable.Range(0, 4).Select(i => Part($"Pin{i}__world", world, mat: "twoside").transform).ToArray();
        var kites = Enumerable.Range(0, 3).Select(i => Part($"Kite{i}__flag", world, mat: "twoside", shadow: false).transform).ToArray();
        var kiteStrings = Enumerable.Range(0, 3).Select(i => Rope($"KiteString{i}", world, cyl, Color.white)).ToArray();
        var gullList = new List<Transform>();
        for (int i = 0; i < 18; i++) { var g = Part("Gull__flap", world, Vector3.zero, false); g.name = "Gull" + i; g.transform.localScale = Vector3.one * (0.9f + (i % 3) * 0.2f); gullList.Add(g.transform); }
        var fishList = new List<Transform>();
        for (int i = 0; i < 10; i++) { var f = Part("Fish__world", world, Vector3.zero, false); f.name = "Fish" + i; f.SetActive(false); fishList.Add(f.transform); }

        // The lighthouse's two beams, and the shafts of light that break through on the beautiful island.
        var beamMesh = Cone("beam_mesh", 900f, 0.5f, 15f, 18);
        var beamA = ConeObject("BeamA", beamMesh, mats["beam"], world);
        var beamB = ConeObject("BeamB", beamMesh, mats["beam"], world);
        beamA.SetActive(false); beamB.SetActive(false);
        var shaftMesh = Cone("shaft_mesh", 900f, 12f, 54f, 16);
        var shafts = new List<Transform>();
        var bPos = V(layout.beautiful);
        var sunAz = SailGame.SunAz * Mathf.Deg2Rad;
        UnityEngine.Random.InitState(3);
        for (int i = 0; i < 7; i++)
        {
            var s = ConeObject("Shaft" + i, shaftMesh, mats["shaft"], world);
            float a = sunAz + (i - 3) * 0.16f;
            float el = (56f + (i % 3) * 7f) * Mathf.Deg2Rad;
            var dir = new Vector3(Mathf.Sin(a) * Mathf.Cos(el), Mathf.Sin(el), Mathf.Cos(a) * Mathf.Cos(el));
            var c = new Vector3(layout.beautiful[0] + (i - 3) * 19f + UnityEngine.Random.Range(-8f, 8f), 20f + UnityEngine.Random.Range(-6f, 26f), layout.beautiful[1] + (i - 3) * -8f);
            s.transform.SetPositionAndRotation(c, Quaternion.LookRotation(dir, Vector3.up));
            s.SetActive(false);
            shafts.Add(s.transform);
        }

        // ---------------- the sea and the wake
        var seaGo = new GameObject("Sea") { layer = 0 };
        seaGo.AddComponent<MeshFilter>();
        var seaR = seaGo.AddComponent<MeshRenderer>();
        seaR.sharedMaterial = mats["sea"];
        seaR.shadowCastingMode = ShadowCastingMode.Off;
        seaR.receiveShadows = true;
        seaR.lightProbeUsage = LightProbeUsage.Off;
        seaR.reflectionProbeUsage = ReflectionProbeUsage.Off;
        var wakeGo = new GameObject("Wake") { layer = 0 };
        var wakeF = wakeGo.AddComponent<MeshFilter>();
        var wakeR = wakeGo.AddComponent<MeshRenderer>();
        wakeR.sharedMaterial = mats["wake"];
        wakeR.shadowCastingMode = ShadowCastingMode.Off;
        wakeR.receiveShadows = false;
        wakeR.lightProbeUsage = LightProbeUsage.Off;
        wakeR.reflectionProbeUsage = ReflectionProbeUsage.Off;

        // ---------------- lights, sky, camera
        var sunGo = new GameObject("Sun");
        var sun = sunGo.AddComponent<Light>();
        sun.type = LightType.Directional;
        sun.color = Color.white;
        sun.intensity = 1f;
        sun.shadows = LightShadows.Soft;
        sun.shadowStrength = 0.85f;
        sun.shadowBias = 0.6f;
        sun.shadowNormalBias = 0.8f;
        sun.shadowNearPlane = 0.5f;
        RenderSettings.sun = sun;
        RenderSettings.skybox = mats["sky"];
        RenderSettings.ambientMode = AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(0.4f, 0.4f, 0.4f);
        RenderSettings.defaultReflectionMode = DefaultReflectionMode.Custom;
        RenderSettings.fog = false;

        var camGo = new GameObject("Camera") { tag = "MainCamera", layer = 0 };
        var cam = camGo.AddComponent<Camera>();
        cam.nearClipPlane = 0.6f;
        cam.farClipPlane = 9000f;
        cam.clearFlags = CameraClearFlags.Skybox;
        cam.allowHDR = true;
        cam.allowMSAA = true;
        cam.fieldOfView = 52f;
        cam.depth = 0;
        var cd = camGo.AddComponent<UniversalAdditionalCameraData>();
        cd.renderPostProcessing = true;
        cd.antialiasing = AntialiasingMode.None;
        cd.dithering = true;
        cd.renderShadows = true;
        cd.requiresColorOption = CameraOverrideOption.Off;
        cd.requiresDepthOption = CameraOverrideOption.Off;
        camGo.AddComponent<AudioListener>();

        // The water's reflection, a smaller second view of only the boat, the islands and the fireworks, mirrored in the sea's plane.
        var rGo = new GameObject("Reflection") { layer = 0 };
        var rc = rGo.AddComponent<Camera>();
        rc.clearFlags = CameraClearFlags.SolidColor;
        rc.backgroundColor = new Color(0, 0, 0, 0);
        rc.cullingMask = 1 << SailGame.ReflectLayer;
        rc.allowHDR = false;
        rc.allowMSAA = false;
        rc.depth = -5;
        var rt = new RenderTexture(640, 360, 16, RenderTextureFormat.ARGB32, RenderTextureReadWrite.sRGB) { name = "ReflRT", useMipMap = false, antiAliasing = 1, filterMode = FilterMode.Bilinear, wrapMode = TextureWrapMode.Clamp };
        AssetDatabase.DeleteAsset(SET + "refl.renderTexture");
        AssetDatabase.CreateAsset(rt, SET + "refl.renderTexture");
        rc.targetTexture = rt;
        var rd = rGo.AddComponent<UniversalAdditionalCameraData>();
        rd.renderPostProcessing = false;
        rd.renderShadows = false;
        rd.requiresColorOption = CameraOverrideOption.Off;
        rd.requiresDepthOption = CameraOverrideOption.Off;
        rd.antialiasing = AntialiasingMode.None;
        Shader.SetGlobalTexture("_ReflTex", rt);

        var vp = AssetDatabase.LoadAssetAtPath<VolumeProfile>(SET + "grade.asset");
        if (vp != null) AssetDatabase.DeleteAsset(SET + "grade.asset");
        vp = ScriptableObject.CreateInstance<VolumeProfile>();
        AssetDatabase.CreateAsset(vp, SET + "grade.asset");
        void Addc<T>(Action<T> f) where T : VolumeComponent
        {
            var c = vp.Add<T>(true);
            AssetDatabase.AddObjectToAsset(c, vp);
            f(c);
        }
        Addc<Tonemapping>(c => c.mode.value = TonemappingMode.Neutral);
        Addc<Bloom>(c => { c.threshold.value = 1.05f; c.intensity.value = 0.55f; c.scatter.value = 0.72f; c.highQualityFiltering.value = false; c.tint.value = new Color(1f, 0.93f, 0.84f); });
        Addc<ColorAdjustments>(c => { c.postExposure.value = 0.05f; c.contrast.value = 10f; c.saturation.value = 10f; });
        Addc<Vignette>(c => { c.intensity.value = 0.2f; c.smoothness.value = 0.5f; });
        EditorUtility.SetDirty(vp);
        var volGo = new GameObject("Grade");
        var vol = volGo.AddComponent<Volume>();
        vol.isGlobal = true;
        vol.sharedProfile = vp;

        // ---------------- particles
        var fx = new GameObject("Effects").transform;
        var spray = Particles("Spray", fx, "spray", 240, ps =>
        {
            var m = ps.main; m.gravityModifier = 0.9f; m.startColor = new Color(1, 1, 1, 0.8f); m.startRotation = new ParticleSystem.MinMaxCurve(0, Mathf.PI * 2);
            var c = ps.colorOverLifetime; c.enabled = true;
            var gr = new Gradient(); gr.SetKeys(new[] { new GradientColorKey(Color.white, 0), new GradientColorKey(Color.white, 1) }, new[] { new GradientAlphaKey(0, 0), new GradientAlphaKey(0.85f, 0.1f), new GradientAlphaKey(0, 1) });
            c.color = gr;
            var s = ps.sizeOverLifetime; s.enabled = true; s.size = new ParticleSystem.MinMaxCurve(1, Ramp(0, 0.6f, 1, 1.5f));
        });
        var churn = Particles("Churn", fx, "churn", 120, ps =>
        {
            var m = ps.main; m.gravityModifier = 0.5f; m.startRotation = new ParticleSystem.MinMaxCurve(0, Mathf.PI * 2);
            var c = ps.colorOverLifetime; c.enabled = true;
            var gr = new Gradient(); gr.SetKeys(new[] { new GradientColorKey(Color.white, 0), new GradientColorKey(Color.white, 1) }, new[] { new GradientAlphaKey(0, 0), new GradientAlphaKey(0.6f, 0.2f), new GradientAlphaKey(0, 1) });
            c.color = gr;
        });
        var splash = Particles("Splash", fx, "spray", 200, ps =>
        {
            var m = ps.main; m.gravityModifier = 1.1f; m.startLifetime = new ParticleSystem.MinMaxCurve(0.5f, 1.0f); m.startSpeed = new ParticleSystem.MinMaxCurve(3f, 9f); m.startSize = new ParticleSystem.MinMaxCurve(0.5f, 1.6f); m.startRotation = new ParticleSystem.MinMaxCurve(0, Mathf.PI * 2);
            var sh = ps.shape; sh.enabled = true; sh.shapeType = ParticleSystemShapeType.Cone; sh.angle = 28; sh.radius = 0.8f;
            ps.transform.rotation = Quaternion.Euler(-90, 0, 0);
            var c = ps.colorOverLifetime; c.enabled = true;
            var gr = new Gradient(); gr.SetKeys(new[] { new GradientColorKey(Color.white, 0), new GradientColorKey(Color.white, 1) }, new[] { new GradientAlphaKey(0.9f, 0), new GradientAlphaKey(0, 1) });
            c.color = gr;
        });
        var sparks = Particles("Sparks", fx, "spark", 1600, ps =>
        {
            var m = ps.main; m.gravityModifier = 0.32f; m.startSpeed = 0;
            var c = ps.colorOverLifetime; c.enabled = true;
            var gr = new Gradient(); gr.SetKeys(new[] { new GradientColorKey(Color.white, 0), new GradientColorKey(new Color(1f, 0.75f, 0.5f), 1) }, new[] { new GradientAlphaKey(1, 0), new GradientAlphaKey(1, 0.45f), new GradientAlphaKey(0, 1) });
            c.color = gr;
            var d = ps.limitVelocityOverLifetime; d.enabled = true; d.dampen = 0.08f; d.limit = 3f;
            var s = ps.sizeOverLifetime; s.enabled = true; s.size = new ParticleSystem.MinMaxCurve(1, Ramp(0, 1f, 1, 0.3f));
        }, SailGame.ReflectLayer);
        var petals = Particles("Petals", fx, "petal", 700, ps =>
        {
            var m = ps.main; m.loop = true; m.duration = 9f; m.startLifetime = new ParticleSystem.MinMaxCurve(6f, 11f); m.startSpeed = new ParticleSystem.MinMaxCurve(3f, 9f);
            m.startSize = new ParticleSystem.MinMaxCurve(0.42f, 1.05f); m.gravityModifier = 0.012f; m.startRotation = new ParticleSystem.MinMaxCurve(0, Mathf.PI * 2);
            m.startColor = new ParticleSystem.MinMaxGradient(new Color(1f, 0.92f, 0.96f), new Color(1f, 0.62f, 0.78f));
            var em = ps.emission; em.enabled = true; em.rateOverTime = 110f;
            var sh = ps.shape; sh.enabled = true; sh.shapeType = ParticleSystemShapeType.Sphere; sh.radius = 42f; sh.radiusThickness = 0.5f;
            var v = ps.velocityOverLifetime; v.enabled = true; v.space = ParticleSystemSimulationSpace.World;
            v.x = new ParticleSystem.MinMaxCurve(2f, 9f); v.y = new ParticleSystem.MinMaxCurve(-1.6f, 0.4f); v.z = new ParticleSystem.MinMaxCurve(-12f, -3f);
            var n = ps.noise; n.enabled = true; n.strength = 1.8f; n.frequency = 0.08f; n.scrollSpeed = 0.3f; n.quality = ParticleSystemNoiseQuality.Low;
            var r = ps.rotationOverLifetime; r.enabled = true; r.z = new ParticleSystem.MinMaxCurve(-2.5f, 2.5f);
            var c = ps.colorOverLifetime; c.enabled = true;
            var gr = new Gradient(); gr.SetKeys(new[] { new GradientColorKey(Color.white, 0), new GradientColorKey(Color.white, 1) }, new[] { new GradientAlphaKey(0, 0), new GradientAlphaKey(1, 0.08f), new GradientAlphaKey(1, 0.86f), new GradientAlphaKey(0, 1) });
            c.color = gr;
        });
        var lanterns = Particles("Lanterns", fx, "lantern", 300, ps =>
        {
            var m = ps.main; m.loop = true; m.duration = 20f; m.startLifetime = new ParticleSystem.MinMaxCurve(20f, 34f); m.startSpeed = new ParticleSystem.MinMaxCurve(0.1f, 0.6f);
            m.startSize = new ParticleSystem.MinMaxCurve(2.6f, 5.2f); m.gravityModifier = 0;
            m.startColor = new ParticleSystem.MinMaxGradient(new Color(3.6f, 1.7f, 0.6f, 1), new Color(3.4f, 1.2f, 0.7f, 1));
            var em = ps.emission; em.enabled = true; em.rateOverTime = 7f;
            var sh = ps.shape; sh.enabled = true; sh.shapeType = ParticleSystemShapeType.Box; sh.scale = new Vector3(1700f, 6f, 1500f);
            ps.transform.position = new Vector3(60f, 4f, 780f);
            var v = ps.velocityOverLifetime; v.enabled = true; v.space = ParticleSystemSimulationSpace.World;
            v.x = new ParticleSystem.MinMaxCurve(-0.6f, 1.4f); v.y = new ParticleSystem.MinMaxCurve(3.2f, 7.8f); v.z = new ParticleSystem.MinMaxCurve(-1.2f, 1.2f);
            var c = ps.colorOverLifetime; c.enabled = true;
            var gr = new Gradient(); gr.SetKeys(new[] { new GradientColorKey(Color.white, 0), new GradientColorKey(Color.white, 1) }, new[] { new GradientAlphaKey(0, 0), new GradientAlphaKey(1, 0.08f), new GradientAlphaKey(1, 0.75f), new GradientAlphaKey(0, 1) });
            c.color = gr;
        }, SailGame.ReflectLayer);

        // ---------------- sound
        AudioClip A(string n)
        {
            var c = AssetDatabase.LoadAssetAtPath<AudioClip>(SND + n + ".wav");
            if (!c) Debug.LogWarning("SAIL no sound " + n);
            return c;
        }
        AudioSource Src(string n, AudioClip c)
        {
            var s = new GameObject(n).AddComponent<AudioSource>();
            s.transform.SetParent(gameGo.transform, false);
            s.clip = c;
            s.playOnAwake = false;
            s.spatialBlend = 0;
            return s;
        }
        game.wind = Src("Wind", A("wind"));
        game.water = Src("Water", A("water"));
        game.creak = Src("Creak", null);
        game.sfx = Src("Sfx", null);
        game.music = Src("Music", null);
        game.clipFill = A("fill"); game.clipFlap = A("flap"); game.clipCreak = A("creak"); game.clipSlap = A("slap"); game.clipHoopoe = A("hoopoe");
        game.clipBeautiful = A("beautiful"); game.clipResearch = A("research"); game.clipPlay = A("play"); game.clipFinale = A("finale");
        game.clipBell = A("bell"); game.clipPop = A("pop"); game.clipLaunch = A("launch"); game.clipSplash = A("splash"); game.clipScrape = A("scrape"); game.clipDing = A("ding");
        game.clipNotes = Enumerable.Range(0, 8).Select(i => A("note" + i)).ToArray();

        // ---------------- a coarse depth map for steering
        const int DN = 256;
        var shore = AssetDatabase.LoadAssetAtPath<Texture2D>(TEX + "shore.png");
        var px = shore.GetPixels32();
        int S = shore.width;
        var depth = new byte[DN * DN];
        for (int y = 0; y < DN; y++)
            for (int x = 0; x < DN; x++)
            {
                int sum = 0, count = 0, step = S / DN;
                for (int j = 0; j < step; j++)
                    for (int i = 0; i < step; i++) { sum += px[(y * step + j) * S + x * step + i].r; count++; }
                depth[y * DN + x] = (byte)(sum / count);
            }

        // ---------------- wire it all up
        game.cam = cam; game.reflCam = rc; game.sun = sun; game.volume = vol;
        game.boat = boat; game.yardPivot = pivot; game.rudder = rudder.transform; game.pennant = pen.transform; game.sheet = sheet; game.clew = clew; game.sheetFoot = foot; game.mastTop = mastTop;
        game.sea = seaGo.transform; game.wake = wakeF;
        game.seaMat = mats["sea"]; game.wakeMat = mats["wake"]; game.sailMat = mats["sail"]; game.pennantMat = mats["flag"]; game.blossomMat = mats["blossom"]; game.flowersMat = mats["flowers"];
        game.lampMat = mats["lamp"]; game.boatLampMat = mats["boatlamp"]; game.beamMat = mats["beam"]; game.shaftMat = mats["shaft"];
        game.bird = birdRoot; game.wingL = wl.transform; game.wingR = wr.transform; game.birdTail = tail.transform; game.birdCrest = crest.transform; game.birdTrail = trail;
        game.islands = new[] { new Vector3(layout.beautiful[0], layout.beautiful[2], layout.beautiful[1]), new Vector3(layout.research[0], layout.research[2], layout.research[1]), new Vector3(layout.play[0], layout.play[2], layout.play[1]) };
        game.lampPos = V(layout.lamp); game.wheelPos = V(layout.wheel); game.bellPos = V(layout.bell);
        game.domeL = domeL.transform; game.domeR = domeR.transform; game.telescope = tele.transform;
        game.beamA = beamA.transform; game.beamB = beamB.transform; game.bell = bell.transform; game.wheel = wheel.transform;
        game.gondolas = gond; game.pinwheels = pins; game.kites = kites; game.kiteStrings = kiteStrings; game.shafts = shafts.ToArray(); game.gulls = gullList.ToArray(); game.fish = fishList.ToArray();
        game.kiteAnchors = new[] { V(layout.kites, 0), V(layout.kites, 3), V(layout.kites, 6) };
        game.depth = depth; game.depthN = DN;
        game.spray = spray; game.churn = churn; game.splash = splash; game.sparks = sparks; game.petals = petals; game.lanterns = lanterns;

        // The sky's texture and the sea's map are globals, since several shaders read them.
        mats["sky"].SetTexture("_CloudTex", T("clouds"));
        mats["sea"].SetVector("_ShoreST", new Vector4(1f / SailGame.ShoreW, 1f / SailGame.ShoreW, 0.5f - SailGame.ShoreCX / SailGame.ShoreW, 0.5f - SailGame.ShoreCZ / SailGame.ShoreW));

        // Keep what must stay loaded for runtime: these get set as globals in Awake from fields on the game.
        var holder = gameGo.AddComponent<SailGlobals>();
        holder.clouds = T("clouds");
        holder.refl = rt;
        holder.shoreST = new Vector4(1f / SailGame.ShoreW, 1f / SailGame.ShoreW, 0.5f - SailGame.ShoreCX / SailGame.ShoreW, 0.5f - SailGame.ShoreCZ / SailGame.ShoreW);
        holder.Apply();

        foreach (var m in mats.Values) EditorUtility.SetDirty(m);
        Directory.CreateDirectory("Assets/Scenes");
        EditorSceneManager.SaveScene(scene, "Assets/Scenes/Sail.unity");
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene("Assets/Scenes/Sail.unity", true) };
        AssetDatabase.SaveAssets();
        Debug.Log("SAIL scene saved");
    }

    // ------------------------------------------------------------------------------------------------ quick stills, without a player build
    public static void Shots()
    {
        var dir = Environment.GetEnvironmentVariable("SAIL_SHOTS") ?? "Shots";
        var only = Environment.GetEnvironmentVariable("SAIL_ONLY");
        Directory.CreateDirectory(dir);
        EditorSceneManager.OpenScene("Assets/Scenes/Sail.unity");
        var game = UnityEngine.Object.FindFirstObjectByType<SailGame>();
        var cam = game.cam;
        game.GetComponent<SailGlobals>().Apply();
        game.InitWorld();
        int w = 1440, h = 810;
        var rt = new RenderTexture(w, h, 24, RenderTextureFormat.ARGB32, RenderTextureReadWrite.sRGB) { antiAliasing = 4 };
        // pos, heading, speed, sail swing, fill, camera position relative to the boat, look relative to the boat, FOV, time, dusk, bloom, heel
        var list = new (string name, Vector3 p, float head, float spd, float swing, float fill, Vector3 cp, Vector3 cl, float fov, float t, float dusk, float bloom, float heel)[]
        {
            ("follow", new Vector3(0, 0, 60), 6, 15, -44, 1, new Vector3(0, 14, -37), new Vector3(0, 9.5f, 34), 54, 12, 0, 0, 7),
            ("wide", new Vector3(0, 0, 60), 6, 15, -44, 1, new Vector3(-30, 7, -26), new Vector3(0, 10, 20), 46, 13, 0, 0, 7),
            ("low", new Vector3(0, 0, 60), 6, 15, -44, 1, new Vector3(24, 3.2f, 26), new Vector3(0, 10, -2), 38, 14, 0, 0, 7),
            ("beautiful", new Vector3(-190, 0, 420), -20, 9, -40, 1, new Vector3(30, 8, -36), new Vector3(-150, 36, 200), 46, 16, 0.2f, 1, 3),
            ("research", new Vector3(420, 0, 680), 30, 9, -40, 1, new Vector3(-24, 9, -34), new Vector3(30, 38, 120), 46, 18, 0.38f, 0, 3),
            ("play", new Vector3(110, 0, 1130), 330, 9, -40, 1, new Vector3(28, 8, -30), new Vector3(-30, 24, 130), 46, 18, 0.5f, 0, 3),
            ("dusk", new Vector3(-100, 0, 1000), 34, 9, -40, 1, new Vector3(-20, 16, -60), new Vector3(0, 14, 80), 42, 18, 1, 1, 3),
            ("back", new Vector3(0, 0, 60), 190, 15, -44, 1, new Vector3(4, 14, 37), new Vector3(0, 9.5f, -34), 54, 12, 0, 0, 7),
            ("first", new Vector3(0, 0, 0), -30, 0, 34, 0.1f, new Vector3(44.5f, 4.2f, -40.5f), new Vector3(0, 9.5f, 0), 32, 3, 0, 0, 0),
            ("mast", new Vector3(0, 0, 60), 6, 0, -44, 1, new Vector3(3.5f, 18.2f, -3f), new Vector3(0, 17.4f, 3.2f), 34, 12, 0, 0, 0),
        };
        foreach (var s in list)
        {
            if (!string.IsNullOrEmpty(only) && !only.Split(',').Contains(s.name)) continue;
            var q = Quaternion.Euler(0, s.head, 0);
            cam.transform.position = s.p + q * s.cp;
            cam.transform.rotation = Quaternion.LookRotation((s.p + q * s.cl) - cam.transform.position);
            cam.fieldOfView = s.fov;
            game.Pose(s.p, s.head, s.spd, s.swing, s.fill, s.t, s.dusk, s.bloom, s.heel);
            if (s.name == "mast") game.PerchForStills();
            cam.targetTexture = rt;
            game.MirrorForStills();
            Shader.SetGlobalFloat("_MirrorClip", 1);
            GL.invertCulling = true;
            game.reflCam.Render();
            GL.invertCulling = false;
            Shader.SetGlobalFloat("_MirrorClip", 0);
            cam.Render();
            var prev = RenderTexture.active;
            RenderTexture.active = rt;
            var tx = new Texture2D(w, h, TextureFormat.RGB24, false, false);
            tx.ReadPixels(new Rect(0, 0, w, h), 0, 0);
            tx.Apply();
            RenderTexture.active = prev;
            File.WriteAllBytes(Path.Combine(dir, s.name + ".jpg"), tx.EncodeToJPG(90));
            Debug.Log("SAIL shot " + s.name);
        }
        cam.targetTexture = null;
    }

    // ------------------------------------------------------------------------------------------------ the player
    public static void WebGL()
    {
        var o = Environment.GetEnvironmentVariable("SAIL_OUT") ?? "Build/sail-game";
        var fast = Environment.GetEnvironmentVariable("SAIL_FAST") == "1";
        Directory.CreateDirectory(o);
        EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.WebGL, BuildTarget.WebGL);
        var texFormat = Environment.GetEnvironmentVariable("SAIL_ASTC") == "1" ? WebGLTextureSubtarget.ASTC : WebGLTextureSubtarget.DXT;
        EditorUserBuildSettings.webGLBuildSubtarget = texFormat;
        PlayerSettings.SetIl2CppCompilerConfiguration(NamedBuildTarget.WebGL, fast ? Il2CppCompilerConfiguration.Debug : Il2CppCompilerConfiguration.Master);
        UnityEditor.WebGL.UserBuildSettings.codeOptimization = fast ? UnityEditor.WebGL.WasmCodeOptimization.BuildTimes : UnityEditor.WebGL.WasmCodeOptimization.DiskSizeLTO;
        if (fast) PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
        else PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Brotli;
        var r = BuildPipeline.BuildPlayer(new BuildPlayerOptions
        {
            scenes = new[] { "Assets/Scenes/Sail.unity" },
            locationPathName = o,
            target = BuildTarget.WebGL,
            subtarget = (int)texFormat,
            options = Environment.GetEnvironmentVariable("SAIL_DEV") == "1" ? BuildOptions.Development : BuildOptions.None,
        });
        Debug.Log($"SAIL build {r.summary.result} size {r.summary.totalSize / 1e6:F1} MB in {r.summary.totalTime}, errors {r.summary.totalErrors}");
        if (r.summary.result != BuildResult.Succeeded) EditorApplication.Exit(1);
    }
}
