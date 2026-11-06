using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;

// Builds the whole project from scratch in batch mode: project settings, materials, the scene, and the WebGL player.
//   Unity -batchmode -quit -projectPath . -buildTarget WebGL -executeMethod ClawBuild.All
public static class ClawBuild
{
    const string ART = "Assets/Art/", TEX = "Assets/Art/Textures/", MAT = "Assets/Art/Materials/", SET = "Assets/Settings/";
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
        PlayerSettings.productName = "Claw";
        PlayerSettings.colorSpace = ColorSpace.Linear;
        PlayerSettings.runInBackground = true;
        PlayerSettings.SplashScreen.show = false;
        PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.WebGL, false);
        PlayerSettings.SetGraphicsAPIs(BuildTarget.WebGL, new[] { GraphicsDeviceType.OpenGLES3 });
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Brotli;
        PlayerSettings.WebGL.decompressionFallback = true;
        PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.None;
        PlayerSettings.WebGL.dataCaching = true;
        PlayerSettings.WebGL.template = "PROJECT:Claw";
        PlayerSettings.WebGL.linkerTarget = WebGLLinkerTarget.Wasm;
        PlayerSettings.WebGL.threadsSupport = false;
        PlayerSettings.WebGL.debugSymbolMode = Environment.GetEnvironmentVariable("CLAW_DEV") == "1" ? WebGLDebugSymbolMode.Embedded : WebGLDebugSymbolMode.Off;
        PlayerSettings.WebGL.nameFilesAsHashes = false;
        PlayerSettings.WebGL.initialMemorySize = 128;
        PlayerSettings.WebGL.maximumMemorySize = 1536;
        PlayerSettings.stripEngineCode = true;
        PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.WebGL, ManagedStrippingLevel.High);

        // The old input manager is all this needs, and needs no extra package.
        var ps = new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/ProjectSettings.asset")[0]);
        var ih = ps.FindProperty("activeInputHandler");
        if (ih != null) { ih.intValue = 0; ps.ApplyModifiedPropertiesWithoutUndo(); }

        Physics.gravity = new Vector3(0, -9.81f, 0);
        Physics.defaultSolverIterations = 10;
        Physics.defaultSolverVelocityIterations = 2;
        Physics.defaultContactOffset = 0.004f;
        Physics.bounceThreshold = 0.6f;
        Physics.sleepThreshold = 0.01f;
        Physics.defaultMaxDepenetrationVelocity = 1.2f;
        Time.fixedDeltaTime = 1f / 60f;
        var tm = new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/TimeManager.asset")[0]);
        tm.FindProperty("Fixed Timestep.m_Count")?.Dispose();
        AssetDatabase.SaveAssets();

        Pipeline();
        Imports();
    }

    static void SetProp(SerializedObject so, string name, Action<SerializedProperty> f)
    {
        var p = so.FindProperty(name);
        if (p == null) { Debug.LogWarning("CLAW no property " + name); return; }
        f(p);
    }

    static void Pipeline()
    {
        const string rdPath = SET + "ClawRenderer.asset", aPath = SET + "ClawURP.asset";
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
        asset.shadowDistance = 7f;
        asset.shadowCascadeCount = 1;
        asset.shadowDepthBias = 0.6f;
        asset.shadowNormalBias = 0.4f;
        var so = new SerializedObject(asset);
        SetProp(so, "m_MainLightShadowmapResolution", p => p.intValue = 4096);
        SetProp(so, "m_MainLightShadowsSupported", p => p.boolValue = true);
        SetProp(so, "m_SoftShadowsSupported", p => p.boolValue = true);
        SetProp(so, "m_AdditionalLightsRenderingMode", p => p.intValue = 1);
        SetProp(so, "m_AdditionalLightsPerObjectLimit", p => p.intValue = 6);
        SetProp(so, "m_AdditionalLightShadowsSupported", p => p.boolValue = false);
        SetProp(so, "m_ReflectionProbeBlending", p => p.boolValue = true);
        SetProp(so, "m_ReflectionProbeBoxProjection", p => p.boolValue = true);
        SetProp(so, "m_RequireDepthTexture", p => p.boolValue = false);
        SetProp(so, "m_RequireOpaqueTexture", p => p.boolValue = false);
        SetProp(so, "m_ColorGradingMode", p => p.intValue = 1);
        SetProp(so, "m_HDRColorBufferPrecision", p => p.intValue = 0);
        so.ApplyModifiedPropertiesWithoutUndo();
        EditorUtility.SetDirty(asset);

        // Ambient occlusion: the contact darkening between prizes, which does a lot for how solid the pile looks.
        if (!rd.rendererFeatures.Any(f => f != null && f.GetType().Name == "ScreenSpaceAmbientOcclusion"))
        {
            var t = typeof(UniversalRendererData).Assembly.GetType("UnityEngine.Rendering.Universal.ScreenSpaceAmbientOcclusion");
            var f = (ScriptableRendererFeature)ScriptableObject.CreateInstance(t);
            f.name = "SSAO";
            AssetDatabase.AddObjectToAsset(f, rd);
            AssetDatabase.TryGetGUIDAndLocalFileIdentifier(f, out string _, out long id);
            rd.rendererFeatures.Add(f);
            var rs = new SerializedObject(rd);
            var map = rs.FindProperty("m_RendererFeatureMap");
            map.arraySize++;
            map.GetArrayElementAtIndex(map.arraySize - 1).longValue = id;
            rs.ApplyModifiedPropertiesWithoutUndo();
            var fs = new SerializedObject(f);
            var st = fs.FindProperty("m_Settings");
            void Set(string n, Action<SerializedProperty> a) { var p = st.FindPropertyRelative(n); if (p != null) a(p); else Debug.LogWarning("CLAW ssao no " + n); }
            Set("Intensity", p => p.floatValue = 1.6f);
            Set("DirectLightingStrength", p => p.floatValue = 0.35f);
            Set("Radius", p => p.floatValue = 0.07f);
            Set("Downsample", p => p.boolValue = true);
            Set("Source", p => p.enumValueIndex = 1);
            fs.ApplyModifiedPropertiesWithoutUndo();
            EditorUtility.SetDirty(f);
        }
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

    static void Tex(string file, bool normal = false, bool srgb = true, int max = 1024, bool crunch = true, int quality = 60, TextureWrapMode wrap = TextureWrapMode.Repeat, bool alpha = true)
    {
        var path = TEX + file + ".png";
        var ti = (TextureImporter)AssetImporter.GetAtPath(path);
        if (ti == null) { Debug.LogError("CLAW missing " + path); return; }
        ti.textureType = normal ? TextureImporterType.NormalMap : TextureImporterType.Default;
        ti.sRGBTexture = srgb && !normal;
        ti.mipmapEnabled = true;
        ti.maxTextureSize = max;
        ti.wrapMode = wrap;
        ti.anisoLevel = 4;
        ti.alphaIsTransparency = false;
        ti.alphaSource = alpha ? TextureImporterAlphaSource.FromInput : TextureImporterAlphaSource.None;
        ti.crunchedCompression = crunch;
        ti.compressionQuality = quality;
        ti.textureCompression = TextureImporterCompression.CompressedHQ;
        ti.SaveAndReimport();
    }

    static void Imports()
    {
        Tex("paint_n", normal: true, max: 512);
        Tex("brushed_n", normal: true, max: 512);
        Tex("brushed_ms", srgb: false, max: 256);
        Tex("smudge_glass", srgb: false, max: 1024, quality: 70);
        Tex("smudge_chrome", srgb: false, max: 512, quality: 70);
        Tex("grain_n", normal: true, max: 256);
        Tex("felt_n", normal: true, max: 256);
        Tex("plush_n", normal: true, max: 512);
        Tex("plush_v", srgb: false, max: 256, alpha: false);
        Tex("cap_atlas", max: 64, crunch: false, wrap: TextureWrapMode.Clamp, alpha: false);
        // Each column is one colourway, and mip levels would blend them at the capsules' poles.
        var cap = (TextureImporter)AssetImporter.GetAtPath(TEX + "cap_atlas.png");
        cap.mipmapEnabled = false;
        cap.textureCompression = TextureImporterCompression.Uncompressed;
        cap.SaveAndReimport();
        Tex("sign", max: 1024, wrap: TextureWrapMode.Clamp, alpha: false);
        Tex("backdrop", max: 1024, wrap: TextureWrapMode.Clamp, alpha: false, quality: 75);
        Tex("coin_n", normal: true, max: 1024, wrap: TextureWrapMode.Clamp, quality: 85);
        Tex("coin_ms", srgb: false, max: 512, wrap: TextureWrapMode.Clamp);
        Tex("coin_ao", srgb: false, max: 256, wrap: TextureWrapMode.Clamp, alpha: false);
        Tex("shadow", srgb: false, max: 256, wrap: TextureWrapMode.Clamp, crunch: false);
        Tex("glow", srgb: false, max: 128, wrap: TextureWrapMode.Clamp, crunch: false);
        Tex("arcade", max: 1024, wrap: TextureWrapMode.Clamp, alpha: false, crunch: false);
        var a = (TextureImporter)AssetImporter.GetAtPath(TEX + "arcade.png");
        a.mipmapEnabled = false;
        a.wrapModeU = TextureWrapMode.Repeat;
        a.wrapModeV = TextureWrapMode.Clamp;
        a.textureCompression = TextureImporterCompression.Uncompressed;
        a.npotScale = TextureImporterNPOTScale.None;
        a.SaveAndReimport();

        var hdr = (TextureImporter)AssetImporter.GetAtPath(TEX + "arcade_hdr.hdr");
        hdr.textureShape = TextureImporterShape.TextureCube;
        var tis = new TextureImporterSettings();
        hdr.ReadTextureSettings(tis);
        tis.cubemapConvolution = TextureImporterCubemapConvolution.Specular;
        tis.generateCubemap = TextureImporterGenerateCubemap.AutoCubemap;
        tis.seamlessCubemap = true;
        tis.mipmapEnabled = true;
        hdr.SetTextureSettings(tis);
        hdr.maxTextureSize = 256;
        hdr.SaveAndReimport();

        var m = (ModelImporter)AssetImporter.GetAtPath(ART + "claw_game.fbx");
        m.materialImportMode = ModelImporterMaterialImportMode.None;
        m.importNormals = ModelImporterNormals.Import;
        m.importTangents = ModelImporterTangents.CalculateMikk;
        m.importAnimation = false;
        m.importCameras = false;
        m.importLights = false;
        m.importBlendShapes = false;
        m.animationType = ModelImporterAnimationType.None;
        m.meshCompression = ModelImporterMeshCompression.Off;
        m.isReadable = false;
        m.SaveAndReimport();

        foreach (var wav in Directory.GetFiles("Assets/Audio", "*.wav"))
        {
            var ai = (AudioImporter)AssetImporter.GetAtPath(wav.Replace('\\', '/'));
            var st = ai.defaultSampleSettings;
            st.loadType = AudioClipLoadType.DecompressOnLoad;
            st.compressionFormat = AudioCompressionFormat.Vorbis;
            st.quality = 0.55f;
            ai.defaultSampleSettings = st;
            ai.SaveAndReimport();
        }
    }

    // ------------------------------------------------------------------------------------------------ materials
    static Dictionary<string, Material> mats = new Dictionary<string, Material>();

    static Texture2D T(string n) => AssetDatabase.LoadAssetAtPath<Texture2D>(TEX + n + ".png");

    static Material Lit(string name, string hex, float smooth, float metal = 0, string normal = null, float nScale = 1, string ms = null, Vector2? tile = null)
    {
        var m = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = name };
        ColorUtility.TryParseHtmlString(hex, out var c);
        m.SetColor("_BaseColor", c);
        m.SetFloat("_Smoothness", smooth);
        m.SetFloat("_Metallic", metal);
        m.SetFloat("_ReceiveShadows", 1);
        if (tile.HasValue) m.SetTextureScale("_BaseMap", tile.Value);
        if (normal != null)
        {
            m.SetTexture("_BumpMap", T(normal));
            m.SetFloat("_BumpScale", nScale);
            m.EnableKeyword("_NORMALMAP");
        }
        if (ms != null)
        {
            m.SetTexture("_MetallicGlossMap", T(ms));
            m.EnableKeyword("_METALLICSPECGLOSSMAP");
            m.SetFloat("_Smoothness", 1);
        }
        m.enableInstancing = false;
        return Keep(m);
    }

    static Material Keep(Material m)
    {
        mats[m.name] = m;
        var path = MAT + m.name + ".mat";
        AssetDatabase.DeleteAsset(path);
        AssetDatabase.CreateAsset(m, path);
        return m;
    }

    static Material Emit(string name, string hex, Color emit, float smooth = 0.5f, string map = null)
    {
        var m = Lit(name, hex, smooth);
        m.EnableKeyword("_EMISSION");
        m.globalIlluminationFlags = MaterialGlobalIlluminationFlags.None;
        m.SetColor("_EmissionColor", emit);
        if (map != null)
        {
            m.SetTexture("_BaseMap", T(map));
            m.SetTexture("_EmissionMap", T(map));
        }
        return m;
    }

    static Material Glass(string name, string hex, float alpha, string ms, float smooth, Vector2 tile)
    {
        var m = Lit(name, hex, smooth, 0, null, 1, ms, tile);
        if (ms != null) m.SetFloat("_Smoothness", smooth);
        ColorUtility.TryParseHtmlString(hex, out var c);
        c.a = alpha;
        m.SetColor("_BaseColor", c);
        m.SetFloat("_Surface", 1);
        m.SetFloat("_Blend", 3);
        m.SetFloat("_SrcBlend", (float)BlendMode.One);
        m.SetFloat("_DstBlend", (float)BlendMode.OneMinusSrcAlpha);
        m.SetFloat("_SrcBlendAlpha", (float)BlendMode.One);
        m.SetFloat("_DstBlendAlpha", (float)BlendMode.OneMinusSrcAlpha);
        m.SetFloat("_ZWrite", 0);
        m.SetFloat("_AlphaToMask", 0);
        m.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
        m.EnableKeyword("_ALPHAPREMULTIPLY_ON");
        m.SetOverrideTag("RenderType", "Transparent");
        m.renderQueue = (int)RenderQueue.Transparent;
        // The lights in the box are stand-ins for its LED strips, so they shouldn't show as round spots in the glass.
        m.SetFloat("_SpecularHighlights", 0);
        m.EnableKeyword("_SPECULARHIGHLIGHTS_OFF");
        m.SetShaderPassEnabled("DepthOnly", false);
        m.SetShaderPassEnabled("DepthNormals", false);
        m.SetShaderPassEnabled("ShadowCaster", false);
        return m;
    }

    static Material Plush(string name, string hex, float sheen = 0.42f)
    {
        var m = new Material(Shader.Find("Sindibad/Plush")) { name = name };
        ColorUtility.TryParseHtmlString(hex, out var c);
        m.SetColor("_BaseColor", c);
        m.SetTexture("_FibreMap", T("plush_n"));
        m.SetTexture("_ValueMap", T("plush_v"));
        m.SetTextureScale("_FibreMap", new Vector2(2.2f, 2.2f));
        m.SetFloat("_FibreScale", 1f);
        m.SetFloat("_Sheen", sheen);
        return Keep(m);
    }

    static Material Additive(string name, string map)
    {
        var m = new Material(Shader.Find("Universal Render Pipeline/Particles/Unlit")) { name = name };
        m.SetTexture("_BaseMap", T(map));
        m.SetColor("_BaseColor", Color.white);
        m.SetFloat("_Surface", 1);
        m.SetFloat("_Blend", 2);
        m.SetFloat("_SrcBlend", (float)BlendMode.SrcAlpha);
        m.SetFloat("_DstBlend", (float)BlendMode.One);
        m.SetFloat("_ZWrite", 0);
        m.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
        m.SetOverrideTag("RenderType", "Transparent");
        m.renderQueue = (int)RenderQueue.Transparent;
        return Keep(m);
    }

    static void Materials()
    {
        mats.Clear();
        var grain = "grain_n";
        Lit("paint", "#f0205f", 0.86f, 0, "paint_n", 0.02f, null, new Vector2(2, 2));
        Lit("ink", "#035d5d", 0.8f, 0, "paint_n", 0.02f, null, new Vector2(2, 2));
        Lit("white", "#efeee9", 0.74f, 0, grain, 0.18f, null, new Vector2(6, 6));
        Lit("chrome", "#eef0f2", 0.95f, 1, null, 1, "smudge_chrome", new Vector2(2.5f, 2.5f));
        Lit("steel", "#c8cacc", 0.6f, 1, "brushed_n", 0.35f, "brushed_ms", new Vector2(4, 4));
        // These line the inside of the base, where the overhead light would otherwise catch them with no cabinet to block it.
        void Matte(Material m) { m.SetFloat("_SpecularHighlights", 0); m.EnableKeyword("_SPECULARHIGHLIGHTS_OFF"); m.SetFloat("_EnvironmentReflections", 0); m.EnableKeyword("_ENVIRONMENTREFLECTIONS_OFF"); }
        Matte(Lit("black", "#0a0c0d", 0.32f));
        Matte(Lit("rubber", "#121314", 0.24f, 0, grain, 0.5f, null, new Vector2(10, 10)));
        Lit("yellow", "#ffc93c", 0.58f, 0, grain, 0.14f, null, new Vector2(6, 6));
        Lit("felt", "#07262c", 0.08f, 0, "felt_n", 1f, null, new Vector2(6, 6));
        Lit("knob", "#fa2a6f", 0.93f);
        Lit("btnyellow", "#ffc93c", 0.88f);
        Lit("btnblue", "#2fa7e0", 0.88f);
        Lit("coil", "#16181a", 0.48f);
        Glass("glass", "#f4fbfb", 0.035f, "smudge_glass", 0.98f, new Vector2(1.2f, 1.2f));
        var acr = Glass("acrylic", "#dff7ff", 0.17f, null, 0.75f, Vector2.one);
        acr.SetFloat("_EnvironmentReflections", 0);
        acr.EnableKeyword("_ENVIRONMENTREFLECTIONS_OFF");
        var smk = Glass("smoke", "#0f1a1c", 0.42f, null, 0.7f, Vector2.one);
        // From inside the box the flap is seen edge-on and would mirror the bright ceiling straight back up the chute.
        smk.SetFloat("_EnvironmentReflections", 0);
        smk.EnableKeyword("_ENVIRONMENTREFLECTIONS_OFF");
        Emit("sign", "#ffffff", Color.white * 1.15f, 0.6f, "sign");
        Emit("signtext", "#ffffff", new Color(1f, 0.96f, 0.9f) * 3.2f, 0.6f);
        foreach (var b in new[] { "bulbA", "bulbB", "bulbC" }) Emit(b, "#ffe9b8", new Color(1f, 0.82f, 0.5f) * 3f, 0.8f);
        Emit("star", "#ffc93c", new Color(1f, 0.74f, 0.2f) * 2.4f, 0.7f);
        Emit("led", "#ffffff", new Color(1f, 0.97f, 0.92f) * 5.5f, 0.7f);
        Emit("ceil", "#ffffff", new Color(1f, 0.97f, 0.93f) * 1.8f, 0.4f);
        Emit("slotlight", "#ff8a2a", new Color(1f, 0.46f, 0.08f) * 2f, 0.8f);
        var bd = Emit("backdrop", "#ffffff", Color.white * 0.16f, 0.42f, "backdrop");

        // A capsule atlas, one material per colourway so the capsule mesh is shared.
        var cap = Lit("cap", "#ffffff", 0.94f);
        cap.SetTexture("_BaseMap", T("cap_atlas"));
        for (int i = 0; i < 8; i++)
        {
            var m = Lit("cap" + i, "#ffffff", 0.94f);
            m.SetTexture("_BaseMap", T("cap_atlas"));
            m.SetTextureOffset("_BaseMap", new Vector2(i / 8f, 0));
        }
        Plush("plushHoney", "#d8995a");
        Plush("plushRose", "#f08fb5");
        Plush("plushSky", "#74c0e6");
        Plush("plushYellow", "#ffd24d");
        Plush("plushCream", "#f4eee0");
        Plush("plushPink", "#fa2a6f");
        Plush("plushTeal", "#12a594");

        var coin = Lit("coin", "#ffd77a", 1f, 1, "coin_n", 0.9f, "coin_ms");
        coin.SetTexture("_OcclusionMap", T("coin_ao"));
        coin.SetFloat("_OcclusionStrength", 0.6f);
        coin.EnableKeyword("_OCCLUSIONMAP");

        var sh = new Material(Shader.Find("Universal Render Pipeline/Unlit")) { name = "floorshadow" };
        sh.SetTexture("_BaseMap", T("shadow"));
        sh.SetColor("_BaseColor", new Color(0, 0, 0, 0.92f));
        sh.SetFloat("_Surface", 1);
        sh.SetFloat("_Blend", 0);
        sh.SetFloat("_SrcBlend", (float)BlendMode.SrcAlpha);
        sh.SetFloat("_DstBlend", (float)BlendMode.OneMinusSrcAlpha);
        sh.SetFloat("_ZWrite", 0);
        sh.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
        sh.SetOverrideTag("RenderType", "Transparent");
        sh.renderQueue = (int)RenderQueue.Transparent - 10;
        Keep(sh);

        var spark = Additive("spark", "glow");
        spark.SetColor("_BaseColor", new Color(5f, 4.2f, 3.2f, 1f));

        var sky = new Material(Shader.Find("Sindibad/ArcadeSky")) { name = "arcadesky" };
        sky.SetTexture("_Pano", T("arcade"));
        sky.SetFloat("_Exposure", 0.5f);
        Keep(sky);
        foreach (var m in mats.Values) EditorUtility.SetDirty(m);
        AssetDatabase.SaveAssets();
    }

    // ------------------------------------------------------------------------------------------------ the scene
    static Dictionary<string, Transform> nodes;

    static GameObject Part(string node, Transform parent, Vector3? local = null, Quaternion? rot = null, bool shadow = true, string mat = null)
    {
        var n = nodes[node];
        var mf = n.GetComponent<MeshFilter>();
        var go = new GameObject(node.Split(new[] { "__" }, StringSplitOptions.None)[0]);
        go.transform.SetParent(parent, false);
        go.transform.localPosition = local ?? (Base * n.localPosition);
        go.transform.localRotation = rot ?? Base;
        go.AddComponent<MeshFilter>().sharedMesh = mf.sharedMesh;
        var mr = go.AddComponent<MeshRenderer>();
        var key = mat ?? node.Split(new[] { "__" }, StringSplitOptions.None)[1];
        if (!mats.TryGetValue(key, out var m)) { Debug.LogError("CLAW no material " + key); }
        mr.sharedMaterial = m;
        mr.shadowCastingMode = shadow ? ShadowCastingMode.On : ShadowCastingMode.Off;
        mr.lightProbeUsage = LightProbeUsage.Off;
        mr.reflectionProbeUsage = ReflectionProbeUsage.BlendProbesAndSkybox;
        return go;
    }

    static GameObject Wall(string name, Transform p, Vector3 min, Vector3 max)
    {
        var g = new GameObject(name);
        g.transform.SetParent(p, false);
        g.transform.position = (min + max) / 2;
        g.AddComponent<BoxCollider>().size = max - min;
        return g;
    }

    public static void Scene()
    {
        AssetDatabase.Refresh();
        Materials();
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        var fbx = AssetDatabase.LoadAssetAtPath<GameObject>(ART + "claw_game.fbx");
        nodes = new Dictionary<string, Transform>();
        foreach (var t in fbx.GetComponentsInChildren<Transform>()) nodes[t.name] = t;
        Debug.Log($"CLAW fbx root scale {fbx.transform.localScale}  nodes {nodes.Count}");
        foreach (var k in new[] { "Knob__knob", "Back__backdrop", "Hub__chrome", "Prong__chrome", "Coin__coin", "Cap__cap", "Bear__plush" })
        {
            var t = nodes[k];
            var b = t.GetComponent<MeshFilter>().sharedMesh.bounds;
            Debug.Log($"CLAW {k} pos {t.localPosition:F3} rot {t.localRotation.eulerAngles:F1} scale {t.localScale:F3} bounds {b.center:F3} ext {b.extents:F3}");
        }

        var root = new GameObject("Machine").transform;

        // The fixed cabinet. With the light straight overhead nothing here needs to cast a shadow; only the moving parts do.
        var cab = new GameObject("Cabinet").transform;
        cab.SetParent(root, false);
        foreach (var kv in nodes)
        {
            var k = kv.Key;
            if (!k.Contains("__")) continue;
            if (k.StartsWith("Cab__") || k.StartsWith("Pane") || k.StartsWith("Chute") || k.StartsWith("Back__") || k.StartsWith("Sign__") || k.StartsWith("PlayText") ||
                k.StartsWith("Bulb__") || k.StartsWith("Star__") || k.StartsWith("SlotLight__") || k.StartsWith("Flap__") || k.StartsWith("BtnLed") || k.StartsWith("Ceil__"))
                Part(k, cab, shadow: false);
        }
        Part("Bed__cap", cab, shadow: false);

        // The floor shadow.
        var fs = GameObject.CreatePrimitive(PrimitiveType.Quad);
        fs.name = "FloorShadow";
        UnityEngine.Object.DestroyImmediate(fs.GetComponent<Collider>());
        fs.transform.SetParent(root, false);
        fs.transform.SetPositionAndRotation(new Vector3(0, 0.004f, -0.05f), Quaternion.Euler(90, 0, 0));
        fs.transform.localScale = new Vector3(3.1f, 3.1f, 1);
        fs.GetComponent<MeshRenderer>().sharedMaterial = mats["floorshadow"];
        fs.GetComponent<MeshRenderer>().shadowCastingMode = ShadowCastingMode.Off;

        // The moving rig.
        var rig = new GameObject("Rig").transform;
        rig.SetParent(root, false);
        var bridge = new GameObject("Bridge").transform; bridge.SetParent(rig, false);
        foreach (var n in new[] { "Bridge__steel", "Bridge2__steel", "BridgeBlock-1__black", "BridgeBlock1__black", "BridgeMotor__steel" }) Part(n, bridge, Vector3.zero);
        var carriage = new GameObject("Carriage").transform; carriage.SetParent(rig, false);
        foreach (var n in new[] { "Carriage__ink", "CarriageMotor__steel", "CarriagePulley__black" }) Part(n, carriage, Vector3.zero);
        var cable = new GameObject("Cable").transform; cable.SetParent(rig, false);
        Part("Wire__steel", cable, Vector3.zero);
        var coil = new GameObject("Coil").transform; coil.SetParent(rig, false);
        Part("Coil__coil", coil, Vector3.zero);

        var phys = new PhysicsMaterial("prize") { dynamicFriction = 0.72f, staticFriction = 0.85f, bounciness = 0.06f, frictionCombine = PhysicsMaterialCombine.Average, bounceCombine = PhysicsMaterialCombine.Minimum };
        AssetDatabase.DeleteAsset(SET + "prize.physicMaterial");
        AssetDatabase.CreateAsset(phys, SET + "prize.physicMaterial");
        var grip = new PhysicsMaterial("grip") { dynamicFriction = 0.9f, staticFriction = 1.0f, bounciness = 0f, frictionCombine = PhysicsMaterialCombine.Maximum, bounceCombine = PhysicsMaterialCombine.Minimum };
        AssetDatabase.DeleteAsset(SET + "grip.physicMaterial");
        AssetDatabase.CreateAsset(grip, SET + "grip.physicMaterial");

        // The claw head and its three prongs, each a kinematic body that shoves prizes for real.
        var hubGo = new GameObject("Hub");
        hubGo.layer = 9;
        hubGo.transform.SetParent(rig, false);
        foreach (var n in new[] { "Hub__chrome", "HubCollar__paint", "HubBolt__black" }) Part(n, hubGo.transform, Vector3.zero);
        foreach (var n in new[] { "HubLug0__black", "HubLug1__black", "HubLug2__black" }) Part(n, hubGo.transform);
        var hb = hubGo.AddComponent<Rigidbody>();
        hb.isKinematic = true;
        hb.interpolation = RigidbodyInterpolation.Interpolate;
        var hs = hubGo.AddComponent<SphereCollider>();
        hs.radius = 0.052f; hs.center = new Vector3(0, 0.012f, 0); hs.sharedMaterial = grip;
        var prongs = new Rigidbody[3];
        Vector2[] path = { new Vector2(0, 0), new Vector2(0.045f, -0.04f), new Vector2(0.078f, -0.112f), new Vector2(0.072f, -0.195f), new Vector2(0.036f, -0.256f), new Vector2(-0.002f, -0.282f) };
        for (int i = 0; i < 3; i++)
        {
            var p = new GameObject("Prong" + i);
            p.layer = 9;
            p.transform.SetParent(rig, false);
            Part("Prong__chrome", p.transform, Vector3.zero);
            Part("ProngTip__rubber", p.transform, Vector3.zero);
            Part("ProngPin__black", p.transform, Vector3.zero);
            var b = p.AddComponent<Rigidbody>();
            b.isKinematic = true;
            b.interpolation = RigidbodyInterpolation.Interpolate;
            for (int s = 0; s < path.Length - 1; s++)
            {
                var a = path[s]; var c = path[s + 1];
                var d = c - a;
                var g = new GameObject("c" + s);
                g.layer = 9;
                g.transform.SetParent(p.transform, false);
                g.transform.localPosition = (a + c) / 2;
                g.transform.localRotation = Quaternion.FromToRotation(Vector3.up, new Vector3(d.x, d.y, 0).normalized);
                var cc = g.AddComponent<CapsuleCollider>();
                cc.radius = s == path.Length - 2 ? 0.0105f : 0.0092f;
                cc.height = d.magnitude + 2 * cc.radius;
                cc.direction = 1;
                cc.sharedMaterial = grip;
            }
            prongs[i] = b;
        }

        // Control deck parts that move.
        var stick = Part("Stick__chrome", rig);
        var knob = Part("Knob__knob", rig);
        var btn = Part("BtnDrop__btnyellow", rig);

        // Walls of the pit and chute, which are invisible; the visible parts are all above.
        var col = new GameObject("Colliders").transform; col.SetParent(root, false);
        const float IX = 0.475f, IZ = 0.435f;
        Wall("floorA", col, new Vector3(-0.155f, 0.76f, -IZ), new Vector3(IX, 0.96f, IZ));
        Wall("floorB", col, new Vector3(-IX, 0.76f, -0.115f), new Vector3(-0.155f, 0.96f, IZ));
        Wall("left", col, new Vector3(-IX - 0.2f, 0.20f, -IZ), new Vector3(-IX, 2.2f, IZ));
        Wall("right", col, new Vector3(IX, 0.76f, -IZ), new Vector3(IX + 0.2f, 2.2f, IZ));
        Wall("back", col, new Vector3(-IX, 0.76f, IZ), new Vector3(IX, 2.2f, IZ + 0.2f));
        Wall("front", col, new Vector3(-IX - 0.2f, 0.55f, -IZ - 0.2f), new Vector3(IX + 0.2f, 2.2f, -IZ));
        Wall("chuteBack", col, new Vector3(-IX, 0.20f, -0.123f), new Vector3(-0.155f, 1.18f, -0.107f));
        Wall("chuteSide", col, new Vector3(-0.163f, 0.55f, -IZ), new Vector3(-0.147f, 1.18f, -0.115f));
        Wall("baySide", col, new Vector3(-0.112f, 0.20f, -0.5f), new Vector3(-0.09f, 0.56f, -0.1f));
        Wall("bayFlap", col, new Vector3(-0.5f, 0.20f, -0.50f), new Vector3(-0.09f, 0.56f, -0.468f));
        Wall("rimBack", col, new Vector3(-IX, 1.16f, -0.125f), new Vector3(-0.11f, 1.2f, -0.075f));
        Wall("rimSide", col, new Vector3(-0.165f, 1.16f, -IZ), new Vector3(-0.115f, 1.2f, -0.075f));
        Wall("rimFront", col, new Vector3(-IX, 1.16f, -IZ), new Vector3(-0.165f, 1.2f, -0.41f));
        Wall("rimLeft", col, new Vector3(-IX, 1.16f, -IZ), new Vector3(-0.45f, 1.2f, -0.125f));
        var tray = new GameObject("tray"); tray.transform.SetParent(col, false);
        tray.transform.SetPositionAndRotation(new Vector3(-0.29f, 0.335f, -0.27f), Quaternion.Euler(-16, 0, 0));
        tray.AddComponent<BoxCollider>().size = new Vector3(0.40f, 0.012f, 0.46f);

        // The prizes.
        UnityEngine.Random.InitState(21);
        var prizes = new List<Prize>();
        var pr = new GameObject("Prizes").transform; pr.SetParent(root, false);
        Vector3 Spot(int i)
        {
            // Stacked in a loose grid above the bed, away from the chute, then dropped.
            int layer = i / 11;
            for (int t = 0; t < 400; t++)
            {
                var v = new Vector3(UnityEngine.Random.Range(-0.39f, 0.39f), 1.12f + layer * 0.17f + UnityEngine.Random.Range(0f, 0.05f), UnityEngine.Random.Range(-0.35f, 0.35f));
                if (v.x < -0.04f && v.z < 0f) continue;
                if (prizes.All(p => (p.transform.position - v).magnitude > 0.17f)) return v;
            }
            return new Vector3(0.2f, 1.9f + i * 0.02f, 0.1f);
        }
        void Add(string node, string mat, string id, Action<GameObject> colliders, float mass, float scale = 1)
        {
            int i = prizes.Count;
            var go = new GameObject(id + i) { layer = ClawGame.PrizeLayer };
            go.transform.SetParent(pr, false);
            go.transform.position = Spot(i);
            go.transform.rotation = UnityEngine.Random.rotation;
            go.transform.localScale = Vector3.one * scale;
            var vis = Part(node, go.transform, Vector3.zero, Base, true, mat);
            colliders(go);
            foreach (var c in go.GetComponents<Collider>()) c.sharedMaterial = phys;
            var b = go.AddComponent<Rigidbody>();
            b.mass = mass;
            b.linearDamping = 0.12f;
            b.angularDamping = 1.1f;
            b.maxDepenetrationVelocity = 0.8f;
            b.collisionDetectionMode = CollisionDetectionMode.Discrete;
            b.interpolation = RigidbodyInterpolation.Interpolate;
            var p = go.AddComponent<Prize>();
            p.id = id;
            p.body = b;
            prizes.Add(p);
        }
        void Sph(GameObject g, float r, Vector3 c) { var s = g.AddComponent<SphereCollider>(); s.radius = r; s.center = c; }
        var order = new List<Action>();
        for (int i = 0; i < 16; i++)
        {
            int k = i % 8; float sc = UnityEngine.Random.Range(0.92f, 1.05f);
            order.Add(() => Add("Cap__cap", "cap" + k, "capsule", g => Sph(g, 0.0815f, Vector3.zero), 0.09f, sc));
        }
        string[] bearC = { "plushHoney", "plushRose", "plushSky", "plushHoney", "plushCream", "plushSky", "plushHoney", "plushRose" };
        for (int i = 0; i < 8; i++)
        {
            string c = bearC[i];
            order.Add(() => Add("Bear__plush", c, "bear", g => { Sph(g, 0.062f, new Vector3(0, -0.005f, 0)); Sph(g, 0.053f, new Vector3(0, 0.085f, 0)); }, 0.11f));
        }
        string[] chickC = { "plushYellow", "plushCream", "plushYellow", "plushRose", "plushYellow", "plushSky" };
        for (int i = 0; i < 6; i++)
        {
            string c = chickC[i];
            order.Add(() => Add("Chick__plush", c, "chick", g => Sph(g, 0.08f, Vector3.zero), 0.09f));
        }
        string[] starC = { "plushPink", "plushYellow", "plushTeal", "plushPink", "plushYellow", "plushSky" };
        for (int i = 0; i < 6; i++)
        {
            string c = starC[i];
            order.Add(() => Add("StarPlush__plush", c, "star", g =>
            {
                Sph(g, 0.052f, Vector3.zero);
                for (int a = 0; a < 5; a++)
                {
                    float an = (90 + 72 * a) * Mathf.Deg2Rad;
                    Sph(g, 0.022f, new Vector3(Mathf.Cos(an) * 0.082f, Mathf.Sin(an) * 0.082f, 0));
                }
            }, 0.07f));
        }
        // Mix the kinds together before dropping them.
        foreach (var a in order.OrderBy(_ => UnityEngine.Random.value)) a();

        // Drop them now, so the pile is already settled when the game opens.
        var keepOut = Wall("keepOut", col, new Vector3(-0.7f, 0.97f, -0.7f), new Vector3(-0.075f, 2.4f, -0.035f));
        var keep = Physics.simulationMode;
        Physics.simulationMode = SimulationMode.Script;
        Physics.SyncTransforms();
        for (int i = 0; i < 900; i++) Physics.Simulate(1f / 120f);
        Physics.simulationMode = SimulationMode.FixedUpdate;
        UnityEngine.Object.DestroyImmediate(keepOut);
        Physics.SyncTransforms();
        // Nothing should be touching the chute's frame to begin with.
        int touching = 0;
        foreach (var nm in new[] { "rimBack", "rimSide", "rimFront", "rimLeft" })
        {
            var box = col.Find(nm).GetComponent<BoxCollider>();
            foreach (var p in prizes) foreach (var cc in p.GetComponents<Collider>())
                if (Physics.ComputePenetration(box, box.transform.position, box.transform.rotation, cc, cc.transform.position, cc.transform.rotation, out _, out _)) touching++;
        }
        Debug.Log("CLAW prizes overlapping the chute rim: " + touching);
        int bad = 0;
        float topY = 0;
        foreach (var p in prizes)
        {
            var q = p.transform.position;
            if (q.y < 0.95f || q.y > 1.5f) { bad++; Debug.LogWarning($"CLAW prize {p.name} at {q:F2}"); }
            topY = Mathf.Max(topY, q.y);
            p.body.linearVelocity = Vector3.zero;
            p.body.angularVelocity = Vector3.zero;
        }
        Debug.Log($"CLAW settled {prizes.Count} prizes, top {topY:F3}, stray {bad}");

        // Lights.
        var lights = new GameObject("Lights").transform; lights.SetParent(root, false);
        var top = new GameObject("Top").AddComponent<Light>();
        top.transform.SetParent(lights, false);
        top.transform.rotation = Quaternion.Euler(90, 0, 0);
        top.type = LightType.Directional;
        top.color = new Color(1f, 0.97f, 0.93f);
        top.intensity = 0.95f;
        top.shadows = LightShadows.Soft;
        top.shadowStrength = 0.86f;
        top.shadowBias = 0.02f;
        top.shadowNormalBias = 0.25f;
        top.shadowNearPlane = 0.1f;
        RenderSettings.sun = top;
        Light Spot2(string n, Vector3 p, Vector3 aim, Color c, float i, float ang, float range)
        {
            var l = new GameObject(n).AddComponent<Light>();
            l.transform.SetParent(lights, false);
            l.transform.position = p;
            l.transform.rotation = Quaternion.LookRotation(aim - p);
            l.type = LightType.Spot;
            l.color = c;
            l.intensity = i;
            l.spotAngle = ang;
            l.innerSpotAngle = ang * 0.5f;
            l.range = range;
            l.shadows = LightShadows.None;
            return l;
        }
        Spot2("Front", new Vector3(1.5f, 2.5f, -3.4f), new Vector3(0, 0.95f, 0), new Color(1f, 0.95f, 0.88f), 8.5f, 50, 9);
        Spot2("Left", new Vector3(-3.0f, 1.7f, -1.6f), new Vector3(0, 0.9f, 0), new Color(0.85f, 0.45f, 0.85f), 4.5f, 46, 8);
        Spot2("Low", new Vector3(1.5f, 0.75f, -2.2f), new Vector3(0.1f, 0.62f, -0.4f), new Color(1f, 0.9f, 0.78f), 1.1f, 52, 5);
        Spot2("Rim", new Vector3(1.8f, 2.8f, 2.4f), new Vector3(0, 1.3f, 0), new Color(0.4f, 0.9f, 1f), 8f, 50, 8);
        Light Pt(string n, Vector3 p, Color c, float i, float range)
        {
            var l = new GameObject(n).AddComponent<Light>();
            l.transform.SetParent(lights, false);
            l.transform.position = p;
            l.type = LightType.Point;
            l.color = c;
            l.intensity = i;
            l.range = range;
            l.shadows = LightShadows.None;
            return l;
        }
        var pa = Pt("PitA", new Vector3(-0.30f, 1.68f, -0.22f), new Color(1f, 0.97f, 0.92f), 0.16f, 1.6f);
        var pb = Pt("PitB", new Vector3(0.30f, 1.68f, 0.22f), new Color(1f, 0.97f, 0.92f), 0.16f, 1.6f);

        // The room.
        RenderSettings.skybox = mats["arcadesky"];
        RenderSettings.ambientMode = AmbientMode.Trilight;
        RenderSettings.ambientSkyColor = new Color(0.36f, 0.35f, 0.38f);
        RenderSettings.ambientEquatorColor = new Color(0.27f, 0.23f, 0.26f);
        RenderSettings.ambientGroundColor = new Color(0.12f, 0.11f, 0.12f);
        RenderSettings.defaultReflectionMode = DefaultReflectionMode.Custom;
        RenderSettings.customReflectionTexture = AssetDatabase.LoadAssetAtPath<Cubemap>(TEX + "arcade_hdr.hdr");
        RenderSettings.reflectionIntensity = 1f;
        RenderSettings.fog = false;

        // Camera and grading.
        var camGo = new GameObject("Camera") { tag = "MainCamera" };
        var cam = camGo.AddComponent<Camera>();
        cam.nearClipPlane = 0.02f;
        cam.farClipPlane = 60f;
        cam.clearFlags = CameraClearFlags.Skybox;
        cam.allowHDR = true;
        cam.allowMSAA = true;
        cam.transform.position = new Vector3(1.75f, 1.42f, -4.5f);
        cam.transform.rotation = Quaternion.LookRotation(new Vector3(0.02f, 1.2f, 0) - cam.transform.position);
        cam.fieldOfView = 31;
        var cd = camGo.AddComponent<UniversalAdditionalCameraData>();
        cd.renderPostProcessing = true;
        cd.antialiasing = AntialiasingMode.None;
        camGo.AddComponent<AudioListener>();

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
        Addc<Bloom>(c => { c.threshold.value = 1.1f; c.intensity.value = 0.5f; c.scatter.value = 0.66f; c.highQualityFiltering.value = false; c.tint.value = new Color(1f, 0.95f, 0.92f); });
        Addc<ColorAdjustments>(c => { c.postExposure.value = 0.0f; c.contrast.value = 8f; c.saturation.value = 8f; });
        Addc<Vignette>(c => { c.intensity.value = 0.24f; c.smoothness.value = 0.45f; });
        EditorUtility.SetDirty(vp);
        var volGo = new GameObject("Grade");
        var vol = volGo.AddComponent<Volume>();
        vol.isGlobal = true;
        vol.sharedProfile = vp;

        // The coin, its halo and the win sparks.
        var slot = new GameObject("SlotPoint").transform;
        slot.SetParent(root, false);
        slot.position = new Vector3(0.30f, 0.60f, -0.50f);
        var coinGo = new GameObject("Coin").transform;
        coinGo.SetParent(root, false);
        Part("Coin__coin", coinGo, Vector3.zero, Quaternion.Euler(0, 0, 180) * Quaternion.Euler(90, 0, 0) * Base);
        var halo = GameObject.CreatePrimitive(PrimitiveType.Quad);
        halo.name = "Halo";
        UnityEngine.Object.DestroyImmediate(halo.GetComponent<Collider>());
        halo.transform.SetParent(root, false);
        var hm = new Material(mats["spark"]) { name = "halo" };
        hm.SetColor("_BaseColor", new Color(1f, 0.82f, 0.45f, 0.75f));
        Keep(hm);
        halo.GetComponent<MeshRenderer>().sharedMaterial = hm;
        halo.GetComponent<MeshRenderer>().shadowCastingMode = ShadowCastingMode.Off;

        var psGo = new GameObject("Sparks");
        var ps = psGo.AddComponent<ParticleSystem>();
        ps.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
        var main = ps.main;
        main.playOnAwake = false;
        main.loop = false;
        main.duration = 0.4f;
        main.startLifetime = new ParticleSystem.MinMaxCurve(0.9f, 1.8f);
        main.startSpeed = new ParticleSystem.MinMaxCurve(0.7f, 2.4f);
        main.startSize = new ParticleSystem.MinMaxCurve(0.018f, 0.055f);
        main.gravityModifier = 0.55f;
        main.maxParticles = 200;
        main.startColor = new ParticleSystem.MinMaxGradient(new Color(1f, 0.8f, 0.35f), new Color(1f, 0.25f, 0.55f));
        var em = ps.emission;
        em.rateOverTime = 0;
        em.SetBursts(new[] { new ParticleSystem.Burst(0, 140) });
        var shp = ps.shape;
        shp.shapeType = ParticleSystemShapeType.Cone;
        shp.angle = 38;
        shp.radius = 0.09f;
        psGo.transform.rotation = Quaternion.Euler(-70, 0, 0);
        var col2 = ps.colorOverLifetime;
        col2.enabled = true;
        var gr = new Gradient();
        gr.SetKeys(new[] { new GradientColorKey(Color.white, 0), new GradientColorKey(Color.white, 1) }, new[] { new GradientAlphaKey(1, 0), new GradientAlphaKey(1, 0.7f), new GradientAlphaKey(0, 1) });
        col2.color = gr;
        psGo.GetComponent<ParticleSystemRenderer>().sharedMaterial = mats["spark"];

        // Sound.
        var game = new GameObject("Game").AddComponent<ClawGame>();
        AudioClip A(string n) => AssetDatabase.LoadAssetAtPath<AudioClip>("Assets/Audio/" + n + ".wav");
        AudioSource Src(string n, AudioClip c)
        {
            var s = new GameObject(n).AddComponent<AudioSource>();
            s.transform.SetParent(game.transform, false);
            s.clip = c;
            s.playOnAwake = false;
            s.spatialBlend = 0;
            return s;
        }
        game.sfx = Src("Sfx", null);
        game.motor = Src("Motor", A("motor"));
        game.winch = Src("Winch", A("winch"));
        game.room = Src("Room", A("room"));
        game.clipPick = A("coin_pick"); game.clipIn = A("coin_in"); game.clipClick = A("click"); game.clipClamp = A("clamp"); game.clipRelease = A("release");
        game.clipThud = A("thud"); game.clipWin = A("win"); game.clipLose = A("lose"); game.clipTick = A("tick"); game.clipStart = A("start");

        game.cam = cam;
        game.coin = coinGo;
        game.coinHalo = halo.transform;
        game.slotPoint = slot;
        game.hub = hb;
        game.prongs = prongs;
        game.bridge = bridge;
        game.carriage = carriage;
        game.cable = cable;
        game.coil = coil;
        game.stick = stick.transform;
        game.knob = knob.transform;
        game.button = btn.transform;
        game.buttonRest = btn.transform.localPosition;
        game.prizes = prizes.ToArray();
        game.bulbA = mats["bulbA"]; game.bulbB = mats["bulbB"]; game.bulbC = mats["bulbC"];
        game.slotLight = mats["slotlight"]; game.buttonLed = mats["led"]; game.signText = mats["signtext"]; game.signMat = mats["sign"]; game.star = mats["star"]; game.ledMat = mats["led"];
        game.pitLightA = pa; game.pitLightB = pb;
        game.confetti = ps;
        game.rendererData = AssetDatabase.LoadAssetAtPath<UniversalRendererData>(SET + "ClawRenderer.asset");
        game.ApplyClaw(0);
        game.DrawRig();
        coinGo.gameObject.SetActive(true);

        // A reflection of the inside of the box, so the claw's chrome and the capsules pick up the LED strips and the pile.
        foreach (var mr in cab.GetComponentsInChildren<MeshRenderer>()) GameObjectUtility.SetStaticEditorFlags(mr.gameObject, StaticEditorFlags.ReflectionProbeStatic);
        foreach (var p in prizes) foreach (var mr in p.GetComponentsInChildren<MeshRenderer>()) GameObjectUtility.SetStaticEditorFlags(mr.gameObject, StaticEditorFlags.ReflectionProbeStatic);
        var rpGo = new GameObject("PitProbe");
        rpGo.transform.SetParent(root, false);
        rpGo.transform.position = new Vector3(0, 1.42f, 0);
        var rp = rpGo.AddComponent<ReflectionProbe>();
        rp.mode = ReflectionProbeMode.Baked;
        rp.boxProjection = true;
        rp.size = new Vector3(0.95f, 1.0f, 0.87f);
        rp.center = new Vector3(0, -0.06f, 0);
        rp.resolution = 256;
        rp.hdr = true;
        rp.blendDistance = 0.04f;
        rp.importance = 2;
        rp.nearClipPlane = 0.02f;
        rp.farClipPlane = 30f;
        rp.intensity = 1.0f;
        EditorSceneManager.SaveScene(scene, "Assets/Scenes/Claw.unity");
        Directory.CreateDirectory("Assets/Scenes/Claw");
        bool baked = Lightmapping.BakeReflectionProbe(rp, "Assets/Scenes/Claw/PitProbe.exr");
        AssetDatabase.Refresh();
        var pi = (TextureImporter)AssetImporter.GetAtPath("Assets/Scenes/Claw/PitProbe.exr");
        if (pi != null)
        {
            pi.textureShape = TextureImporterShape.TextureCube;
            var pts = new TextureImporterSettings();
            pi.ReadTextureSettings(pts);
            pts.cubemapConvolution = TextureImporterCubemapConvolution.Specular;
            pts.generateCubemap = TextureImporterGenerateCubemap.AutoCubemap;
            pts.mipmapEnabled = true;
            pi.SetTextureSettings(pts);
            pi.maxTextureSize = 256;
            pi.SaveAndReimport();
        }
        rp.mode = ReflectionProbeMode.Custom;
        rp.customBakedTexture = AssetDatabase.LoadAssetAtPath<Cubemap>("Assets/Scenes/Claw/PitProbe.exr");
        Debug.Log("CLAW probe baked " + baked + " texture " + rp.customBakedTexture);
        EditorSceneManager.SaveScene(scene, "Assets/Scenes/Claw.unity");
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene("Assets/Scenes/Claw.unity", true) };
        AssetDatabase.SaveAssets();
        Debug.Log("CLAW scene saved");
    }

    // ------------------------------------------------------------------------------------------------ quick stills, without a player build
    public static void Shots()
    {
        var dir = Environment.GetEnvironmentVariable("CLAW_SHOTS") ?? "Shots";
        Directory.CreateDirectory(dir);
        EditorSceneManager.OpenScene("Assets/Scenes/Claw.unity");
        var game = UnityEngine.Object.FindFirstObjectByType<ClawGame>();
        var cam = game.cam;
        game.coin.gameObject.SetActive(false);
        game.coinHalo.gameObject.SetActive(false);
        if (Environment.GetEnvironmentVariable("CLAW_HIDEPRIZES") == "1") foreach (var p in game.prizes) p.gameObject.SetActive(false);
        var rt = new RenderTexture(1440, 900, 24, RenderTextureFormat.ARGB32, RenderTextureReadWrite.sRGB);
        rt.antiAliasing = 4;
        var list = new (string, Vector3, Vector3, float)[]
        {
            ("over", new Vector3(1.75f, 1.42f, -4.5f), new Vector3(0.02f, 1.2f, 0), 31),
            ("coin", new Vector3(0.70f, 0.90f, -1.72f), new Vector3(0.10f, 0.74f, -0.45f), 36),
            ("inside", new Vector3(-0.1f, 1.70f, -0.385f), new Vector3(-0.15f, 1.15f, 0.0f), 66),
            ("pile", new Vector3(0.1f, 1.45f, -0.9f), new Vector3(0.05f, 1.1f, 0.0f), 38),
            ("door", new Vector3(0.02f, 0.92f, -1.92f), new Vector3(-0.17f, 0.66f, -0.45f), 34),
            ("top", new Vector3(-0.2f, 2.2f, -1.9f), new Vector3(0f, 2.0f, -0.4f), 34),
            ("slot", new Vector3(0.40f, 0.68f, -0.92f), new Vector3(0.30f, 0.60f, -0.5f), 22),
            ("chute", new Vector3(0.05f, 1.72f, -0.42f), new Vector3(-0.2f, 1.1f, -0.15f), 60),
        };
        cam.targetTexture = rt;
        for (int i = 0; i < 4; i++) cam.Render();
        foreach (var (n, p, l, f) in list)
        {
            cam.transform.position = p;
            cam.transform.rotation = Quaternion.LookRotation(l - p);
            cam.fieldOfView = f;
            cam.targetTexture = rt;
            cam.Render();
            var prev = RenderTexture.active;
            RenderTexture.active = rt;
            var tx = new Texture2D(rt.width, rt.height, TextureFormat.RGB24, false, false);
            tx.ReadPixels(new Rect(0, 0, rt.width, rt.height), 0, 0);
            tx.Apply();
            RenderTexture.active = prev;
            File.WriteAllBytes(Path.Combine(dir, n + ".jpg"), tx.EncodeToJPG(90));
            Debug.Log("CLAW shot " + n);
        }
        cam.targetTexture = null;
        var ww = Shader.globalMaximumLOD;
    }

    // ------------------------------------------------------------------------------------------------ the player
    public static void WebGL()
    {
        var o = Environment.GetEnvironmentVariable("CLAW_OUT") ?? "Build/claw-game";
        var fast = Environment.GetEnvironmentVariable("CLAW_FAST") == "1";
        Directory.CreateDirectory(o);
        EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.WebGL, BuildTarget.WebGL);
        var texFormat = Environment.GetEnvironmentVariable("CLAW_ASTC") == "1" ? WebGLTextureSubtarget.ASTC : WebGLTextureSubtarget.DXT;
        EditorUserBuildSettings.webGLBuildSubtarget = texFormat;
        PlayerSettings.SetIl2CppCompilerConfiguration(NamedBuildTarget.WebGL, fast ? Il2CppCompilerConfiguration.Debug : Il2CppCompilerConfiguration.Master);
        UnityEditor.WebGL.UserBuildSettings.codeOptimization = fast ? UnityEditor.WebGL.WasmCodeOptimization.BuildTimes : UnityEditor.WebGL.WasmCodeOptimization.DiskSizeLTO;
        if (fast) PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
        else PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Brotli;
        var r = BuildPipeline.BuildPlayer(new BuildPlayerOptions
        {
            scenes = new[] { "Assets/Scenes/Claw.unity" },
            locationPathName = o,
            target = BuildTarget.WebGL,
            subtarget = (int)texFormat,
            extraScriptingDefines = Environment.GetEnvironmentVariable("CLAW_TEST") == "1" ? new[] { "CLAW_TEST" } : null,
            options = Environment.GetEnvironmentVariable("CLAW_DEV") == "1" ? BuildOptions.Development : BuildOptions.None,
        });
        Debug.Log($"CLAW build {r.summary.result} size {r.summary.totalSize / 1e6:F1} MB in {r.summary.totalTime}, errors {r.summary.totalErrors}");
        if (r.summary.result != BuildResult.Succeeded) EditorApplication.Exit(1);
    }
}
