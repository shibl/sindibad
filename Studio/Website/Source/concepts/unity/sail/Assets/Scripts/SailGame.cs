using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

// The whole game: the sea, the boat, the hoopoe, the three islands and the finale. World axes are X east, Y up and Z north, with
// the boat starting at the origin and the archipelago ahead. All words and buttons live in the host page, which hears about
// everything through Send() and talks back with SendMessage on the public methods at the bottom.
public class SailGame : MonoBehaviour
{
    public const float SunAz = 24f;              // Must match the cloud painting in blender/gen_textures.py.
    public const float MaxSpeed = 19f;
    public const float StartHeading = -30f;     // Straight at the beautiful island.
    public const int ReflectLayer = 8;
    public const float ShoreW = 2800f, ShoreCX = 60f, ShoreCZ = 800f;

    [Header("Scene")]
    public Camera cam, reflCam;
    public Light sun;
    public Volume volume;
    public Transform boat, yardPivot, rudder, pennant, sheet, clew, sheetFoot, mastTop;
    public Transform sea;
    public MeshFilter wake;
    public Material seaMat, wakeMat, sailMat, pennantMat, blossomMat, flowersMat, lampMat, boatLampMat, beamMat, shaftMat, routeMat;

    [Header("Hoopoe")]
    public Transform bird, wingL, wingR, birdTail, birdCrest;
    public TrailRenderer birdTrail;

    [Header("Islands")]
    public Vector3[] islands = new Vector3[3];   // x, radius, z. Beautiful, research, play.
    public Vector3 lampPos, wheelPos, bellPos;
    public Transform domeL, domeR, telescope, beamA, beamB, bell, wheel;
    public Transform[] gondolas, pinwheels, kites, kiteStrings, shafts, gulls;
    public Vector3[] kiteAnchors;
    public Transform[] fish;
    public byte[] depth;                          // A coarse copy of the depth map, for steering round land.
    public int depthN;

    [Header("Particles")]
    public ParticleSystem spray, churn, petals, sparks, splash, lanterns, flock;

    [Header("Sound")]
    public AudioSource wind, water, creak, sfx, music;
    public AudioClip clipFill, clipFlap, clipCreak, clipSlap, clipHoopoe, clipBeautiful, clipResearch, clipPlay, clipFinale, clipBell, clipPop, clipLaunch, clipSplash, clipScrape, clipDing;
    public AudioClip[] clipNotes;

    // Sailing state.
    public enum St { Boot, Intro, Sail, Moment, Finale, Done }
    public St state = St.Boot;
    public float heading, speed, yawRate, rudderPos, heel, heelVel, pitch, pitchVel, heave, heaveVel, roll, rollVel;
    public Vector3 pos;
    float swing = 40f, swingVel, fill, luff = 1f, windSide = 1f;
    Vector2 windDir;
    bool autoHelm;
    float autoHeading;
    float autoSpeed = -1f;
    bool auto;       // A hands-off helmsman, for tests and the shot tool.

    // Input.
    float keySteer, pointerSteer, hostSteer;
    bool pointerLive;
    Vector2 pointerStart;
    float keyTrim;
    bool steerLocked = true;

    // Progress.
    public bool[] visited = new bool[3];
    int visitedCount;
    int nextIsland = -1;
    float dusk, duskTarget, glory, gloryTarget;
    float sunAlt = 9f;
    float flash;
    float motion = 1f;
    bool lite;

    // Camera.
    Vector3 camPos, camLook, camPosV, camLookV;
    float camYaw, camYawV, camFov = 52f, shake;
    float shotW, shotTarget;
    Vector3 shotPos, shotLook, shotFrom, shotFromLook;
    float shotFov = 42f, shotBlend = 1.6f;

    // Hoopoe.
    Vector3 birdPos, birdVel;
    float birdPhase, birdBank, birdCrestUp;
    bool perched = true;

    // Wake.
    const int WakeN = 90;
    struct WakeS { public Vector3 p, side; public float born, str; }
    readonly WakeS[] armL = new WakeS[WakeN], armR = new WakeS[WakeN], mid = new WakeS[WakeN];
    int wakeHead, wakeCount;
    float wakeClock;
    Mesh wakeMesh;
    readonly List<Vector3> wv = new List<Vector3>(WakeN * 6);
    readonly List<Color> wc = new List<Color>(WakeN * 6);
    readonly List<Vector2> wu = new List<Vector2>(WakeN * 6);
    readonly List<int> wi = new List<int>(WakeN * 18);

    // Moments.
    float wheelAngle, wheelSpeed = 7f, pinSpeed = 40f, pinAngle, bellSwing, bellVel;
    float chartR, chartFade, routeFade;
    float domeOpen, beamOn, beamAngle, lampGlow;
    float bloom;
    float lastPos;
    bool canJump;
    int noteIndex;
    Coroutine moment;
    readonly Vector4[] routes = new Vector4[3];
    float[] fishT;
    Vector3[] fishA, fishB;
    float[] fishDur;

    // Waves, read by both the shader and the boat.
    static readonly float[,] WaveTable = {
        // wavelength, amplitude, direction in degrees, steepness, phase
        { 64f, 0.62f, 20f, 0.42f, 0.0f },
        { 39f, 0.38f, -14f, 0.5f, 1.3f },
        { 24f, 0.22f, 47f, 0.6f, 2.6f },
        { 14.5f, 0.12f, -38f, 0.7f, 4.0f },
        { 8.5f, 0.065f, 74f, 0.75f, 0.7f },
        { 5.1f, 0.036f, 6f, 0.8f, 3.1f },
    };
    readonly Vector4[] waveA = new Vector4[6], waveB = new Vector4[6];

    [DllImport("__Internal")] static extern void SailSend(string name, string value);
    public static void Send(string name, string value = "")
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        SailSend(name, value);
#endif
    }
    static string F(float v) => v.ToString("0.###", CultureInfo.InvariantCulture);

    // ------------------------------------------------------------------------------------------------ set-up
    Bloom bloomFx;
    ColorAdjustments gradeFx;

    void Awake()
    {
        if (volume && volume.sharedProfile)
        {
            volume.sharedProfile.TryGet(out bloomFx);
            volume.sharedProfile.TryGet(out gradeFx);
        }
        Application.targetFrameRate = -1;
        QualitySettings.vSyncCount = 1;
        Time.maximumDeltaTime = 0.1f;
        lite = Application.isMobilePlatform;
        if (lite) MobileQuality();
        InitWorld();
    }

    // Phones get the same picture for less: a single shadow cascade close in, 2x MSAA, and no second view for the water's reflection.
    void MobileQuality()
    {
        var a = GraphicsSettings.currentRenderPipeline as UniversalRenderPipelineAsset;
        if (a != null)
        {
            a.shadowDistance = 110f;
            a.shadowCascadeCount = 1;
            a.msaaSampleCount = 2;
        }
        if (reflCam) reflCam.enabled = false;
        var g = GetComponent<SailGlobals>();
        if (g) g.reflections = false;
    }

    // Everything the shaders need before a frame can be drawn. Also called by the editor when it takes stills.
    public void InitWorld()
    {
        for (int i = 0; i < 6; i++)
        {
            float lambda = WaveTable[i, 0], amp = WaveTable[i, 1], dir = WaveTable[i, 2] * Mathf.Deg2Rad, q = WaveTable[i, 3], phase = WaveTable[i, 4];
            float k = 2 * Mathf.PI / lambda;
            waveA[i] = new Vector4(Mathf.Sin(dir), Mathf.Cos(dir), amp, k);
            waveB[i] = new Vector4(Mathf.Sqrt(9.81f * k), q / (k * amp * 6f), phase, 0);
        }
        Shader.SetGlobalVectorArray("_WaveA", waveA);
        Shader.SetGlobalVectorArray("_WaveB", waveB);
        Shader.SetGlobalFloat("_Lite", lite ? 1 : 0);
        BuildSea();
        wakeMesh = new Mesh { name = "Wake" };
        wakeMesh.MarkDynamic();
        wakeMesh.bounds = new Bounds(Vector3.zero, Vector3.one * 100000f);
        wake.sharedMesh = wakeMesh;
        var w = new Vector2(0.28f, 0.96f);
        windDir = w.normalized;
        ApplyPalette(0);
        SetGlobals(0);
    }

    // A disc of rings that get wider with distance: fine under the boat and coarse at the horizon, and it follows the camera.
    void BuildSea()
    {
        var mf = sea.GetComponent<MeshFilter>();
        int rings = lite ? 80 : 150, segs = lite ? 72 : 160;
        var v = new Vector3[(rings + 1) * segs + 1];
        var idx = new int[segs * 3 + rings * segs * 6];
        v[0] = Vector3.zero;
        for (int r = 0; r <= rings; r++)
        {
            float u = (r + 1f) / (rings + 1f);
            float rad = 1.5f + 6500f * Mathf.Pow(u, 3.4f);
            for (int s = 0; s < segs; s++)
            {
                float a = (s + (r & 1) * 0.5f) / segs * Mathf.PI * 2;
                v[1 + r * segs + s] = new Vector3(Mathf.Cos(a) * rad, 0, Mathf.Sin(a) * rad);
            }
        }
        int t = 0;
        for (int s = 0; s < segs; s++)
        {
            idx[t++] = 0; idx[t++] = 1 + (s + 1) % segs; idx[t++] = 1 + s;
        }
        for (int r = 0; r < rings; r++)
            for (int s = 0; s < segs; s++)
            {
                int a = 1 + r * segs + s, b = 1 + r * segs + (s + 1) % segs, c = 1 + (r + 1) * segs + s, d = 1 + (r + 1) * segs + (s + 1) % segs;
                if ((r & 1) == 0)
                {
                    idx[t++] = a; idx[t++] = b; idx[t++] = c;
                    idx[t++] = b; idx[t++] = d; idx[t++] = c;
                }
                else
                {
                    idx[t++] = a; idx[t++] = d; idx[t++] = c;
                    idx[t++] = a; idx[t++] = b; idx[t++] = d;
                }
            }
        var m = new Mesh { name = "Sea", indexFormat = IndexFormat.UInt32 };
        m.vertices = v;
        m.triangles = idx;
        m.bounds = new Bounds(Vector3.zero, Vector3.one * 100000f);
        mf.sharedMesh = m;
    }

    void Start()
    {
        pos = Vector3.zero;
        heading = StartHeading;
        speed = 0;
        camYaw = heading;
        birdPos = mastTop.position;
        ResetWorld();
        if (wind) { wind.loop = true; wind.volume = 0.1f; wind.Play(); }
        if (water) { water.loop = true; water.volume = 0.1f; water.Play(); }
        if (creak) { creak.loop = false; }
        SyncBoat(0.016f);
        StartCoroutine(Boot());
    }

    void ResetWorld()
    {
        for (int i = 0; i < 3; i++) visited[i] = false;
        visitedCount = 0;
        dusk = duskTarget = 0;
        glory = gloryTarget = 0;
        bloom = 0;
        chartR = 0; chartFade = 0; routeFade = 0;
        domeOpen = 0; beamOn = 0; lampGlow = 0;
        wheelSpeed = 7f; pinSpeed = 40f;
        canJump = false;
        Shader.SetGlobalFloat("_Flash", 0);
        blossomMat.SetFloat("_Open", 0);
        flowersMat.SetFloat("_Open", 0);
        if (beamA) { beamA.gameObject.SetActive(false); beamB.gameObject.SetActive(false); }
        foreach (var s in shafts) s.gameObject.SetActive(false);
        ApplyPalette(0);
        for (int i = 0; i < 3; i++) routes[i] = Vector4.zero;
        Shader.SetGlobalVectorArray("_Routes", routes);
        Shader.SetGlobalFloat("_Chart", 0);
        Shader.SetGlobalFloat("_RouteFade", 0);
        foreach (var f in fish) f.gameObject.SetActive(false);
        fishT = new float[fish.Length];
        fishA = new Vector3[fish.Length];
        fishB = new Vector3[fish.Length];
        fishDur = new float[fish.Length];
        for (int i = 0; i < fish.Length; i++) fishT[i] = -1;
    }

    IEnumerator Boot()
    {
        // Two full frames first, so the page lifts its curtain on a finished picture.
        yield return null;
        yield return null;
        Send("ready");
        StartCoroutine(Intro());
    }

    // ------------------------------------------------------------------------------------------------ the first seconds
    IEnumerator Intro()
    {
        state = St.Intro;
        Send("state", "intro");
        perched = true;
        steerLocked = true;
        autoHelm = true; autoHeading = heading;
        autoSpeed = 0f;
        luff = 1f; fill = 0.06f;
        swing = 34f;
        // The first picture is the poster: low on the water, looking into the sun, with the sail shivering against it.
        shotW = 1f; shotTarget = 1f;
        var sunFlat = new Vector3(Mathf.Sin(SunAz * Mathf.Deg2Rad), 0, Mathf.Cos(SunAz * Mathf.Deg2Rad));
        var across = new Vector3(sunFlat.z, 0, -sunFlat.x);
        shotPos = pos - sunFlat * 62f - across * 6f + Vector3.up * 4.2f;
        shotLook = pos + Vector3.up * 9.5f;
        shotFov = 32f;
        camFov = shotFov;
        float t = 0;
        Vector3 startP = shotPos;
        while (t < 2.3f)
        {
            t += Time.deltaTime;
            shotPos = startP + (across * 5f + sunFlat * 5f) * (t / 2.3f) * motion;
            yield return null;
        }
        // The sail fills with a whump, the boat leans into it, the hoopoe leaves.
        Play(clipFill, 0.9f);
        Play(clipHoopoe, 0.55f);
        perched = false;
        birdVel = Fwd() * 6f + Vector3.up * 4f;
        autoSpeed = -1f;
        heelVel -= 8f * motion;
        Send("state", "fill");
        shotTarget = 0f;
        shotBlend = 3.0f;
        yield return new WaitForSeconds(2.0f);
        autoHelm = false;
        steerLocked = false;
        pointerStart = Input.mousePosition;
        pointerLive = false;
        state = St.Sail;
        Send("state", "sail");
    }

    // ------------------------------------------------------------------------------------------------ per frame
    void Update()
    {
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        ReadInput(dt);
        if (state != St.Boot) Sail(dt);
        SyncBoat(dt);
        Wake(dt);
        Bird(dt);
        Effects(dt);
        ArrivalCheck();
        Sound(dt);
        Report(dt);
        SetGlobals(dt);
    }

    void LateUpdate()
    {
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        CameraRig(dt);
        sea.position = new Vector3(cam.transform.position.x, 0, cam.transform.position.z);
        Reflection();
    }

    // ------------------------------------------------------------------------------------------------ input
    void ReadInput(float dt)
    {
        float k = 0;
        if (Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A)) k -= 1;
        if (Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D)) k += 1;
        keySteer = Mathf.MoveTowards(keySteer, k, dt * (k == 0 ? 4f : 2.6f));
        float tr = 0;
        if (Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.W)) tr += 1;
        if (Input.GetKey(KeyCode.DownArrow) || Input.GetKey(KeyCode.S)) tr -= 1;
        keyTrim = Mathf.MoveTowards(keyTrim, tr, dt * 2f);

        // A pointer steers by how far it is from the middle. Touch steers while held; a mouse once it has moved.
        float target = 0;
        if (Input.touchCount > 0)
        {
            var t = Input.GetTouch(0);
            target = SteerFrom(t.position.x);
            pointerLive = false;
        }
        else if (!Application.isMobilePlatform)
        {
            Vector2 m = Input.mousePosition;
            if (!pointerLive && (m - pointerStart).magnitude > 30f) pointerLive = true;
            if (pointerLive) target = SteerFrom(m.x);
        }
        pointerSteer = Mathf.MoveTowards(pointerSteer, target, dt * 5f);
        if (Input.GetKeyDown(KeyCode.Space) || (canJump && (Input.GetMouseButtonDown(0) || (Input.touchCount > 0 && Input.GetTouch(0).phase == TouchPhase.Began))))
            Tap("");
    }

    float SteerFrom(float x)
    {
        float v = (x / Mathf.Max(1, Screen.width) - 0.5f) * 2f;
        float a = Mathf.Abs(v);
        a = Mathf.Clamp01((a - 0.05f) / 0.62f);
        return Mathf.Sign(v) * a * a * (3f - 2f * a);
    }

    // ------------------------------------------------------------------------------------------------ the boat
    Vector3 Fwd() { float a = heading * Mathf.Deg2Rad; return new Vector3(Mathf.Sin(a), 0, Mathf.Cos(a)); }
    Vector3 Right() { float a = heading * Mathf.Deg2Rad; return new Vector3(Mathf.Cos(a), 0, -Mathf.Sin(a)); }

    public float SeaHeight(float x, float z, float time)
    {
        float y = 0;
        for (int i = 0; i < 6; i++)
        {
            var A = waveA[i]; var B = waveB[i];
            y += A.z * Mathf.Sin(A.w * (A.x * x + A.y * z) - B.x * time + B.z);
        }
        return y;
    }

    public float DepthAt(float x, float z)
    {
        // 0 is ashore, about 0.25 the waterline, 1 open water.
        if (depth == null || depth.Length == 0) return 1f;
        float u = (x - ShoreCX) / ShoreW + 0.5f, v = (z - ShoreCZ) / ShoreW + 0.5f;
        if (u <= 0 || v <= 0 || u >= 1 || v >= 1) return 1f;
        float fx = u * depthN - 0.5f, fy = v * depthN - 0.5f;
        int ix = Mathf.Clamp(Mathf.FloorToInt(fx), 0, depthN - 2), iy = Mathf.Clamp(Mathf.FloorToInt(fy), 0, depthN - 2);
        fx -= ix; fy -= iy;
        float a = depth[iy * depthN + ix], b = depth[iy * depthN + ix + 1], c = depth[(iy + 1) * depthN + ix], d = depth[(iy + 1) * depthN + ix + 1];
        return Mathf.Lerp(Mathf.Lerp(a, b, fx), Mathf.Lerp(c, d, fx), fy) / 255f;
    }

    void Sail(float dt)
    {
        // Which way to turn.
        float steer = 0;
        bool free = state == St.Sail && !steerLocked;
        if (free) steer = Mathf.Clamp(keySteer + pointerSteer + hostSteer, -1, 1);
        if (auto && state == St.Sail)
        {
            int id = NearestUnvisited();
            if (id >= 0)
            {
                var toI = new Vector3(islands[id].x, 0, islands[id].z) - pos;
                float want = Mathf.Atan2(toI.x, toI.z) * Mathf.Rad2Deg;
                steer = Mathf.Clamp(Mathf.DeltaAngle(heading, want) / 30f, -1, 1);
            }
        }
        if (autoHelm) steer = Mathf.Clamp(Mathf.DeltaAngle(heading, autoHeading) / 26f, -1, 1);

        // Land nudges you round it. The lookahead probes either bow and leans the helm away from whichever is shallower.
        var f = Fwd(); var r = Right();
        var bow = pos + f * (10f + speed * 1.8f);
        float dA = DepthAt(bow.x + r.x * 14f, bow.z + r.z * 14f), dB = DepthAt(bow.x - r.x * 14f, bow.z - r.z * 14f);
        float nearLand = 1f - Mathf.Clamp01((Mathf.Min(dA, dB) - 0.3f) / 0.1f);
        if (nearLand > 0) steer += Mathf.Sign(dA - dB + 0.0001f) * nearLand * 1.3f;

        // The edge of the world: a kind current that brings you round rather than a wall.
        float fromCentre = new Vector2(pos.x - ShoreCX, pos.z - ShoreCZ).magnitude;
        if (fromCentre > 1180f)
        {
            float want = Mathf.Atan2(ShoreCX - pos.x, ShoreCZ - pos.z) * Mathf.Rad2Deg;
            steer += Mathf.Clamp(Mathf.DeltaAngle(heading, want) / 40f, -1, 1) * Mathf.Clamp01((fromCentre - 1180f) / 120f) * 1.2f;
        }
        steer = Mathf.Clamp(steer, -1, 1);
        rudderPos = Mathf.MoveTowards(rudderPos, steer, dt * 2.4f);

        // Turning needs way on, and a turn takes a moment to start and to stop: that's the weight of the boat.
        float authority = Mathf.Clamp(speed / 9f, 0.22f, 1f);
        float yawTarget = rudderPos * 26f * authority;
        yawRate += (yawTarget - yawRate) * (1f - Mathf.Exp(-dt * 1.9f));
        heading = Mathf.Repeat(heading + yawRate * dt, 360f);

        // Wind: fastest on a reach, slower dead downwind, and heading up into it the sail spills and she slows, but never stops.
        var wd = new Vector3(windDir.x, 0, windDir.y);
        float cosA = Vector3.Dot(f, wd);                       // 1 running, -1 head to wind
        float ang = Mathf.Acos(Mathf.Clamp(cosA, -1, 1)) * Mathf.Rad2Deg;
        float polar = Mathf.Lerp(0.82f, 1f, Mathf.Sin(Mathf.Clamp(ang, 0, 110) / 110f * Mathf.PI * 0.5f));
        polar = Mathf.Lerp(polar, 0.44f, Mathf.InverseLerp(115f, 170f, ang));
        float vT = MaxSpeed * polar * (1f + keyTrim * 0.14f);
        if (autoSpeed >= 0) vT = autoSpeed;
        vT -= Mathf.Abs(yawRate) * 0.1f;
        float tau = vT > speed ? 3.0f : 5.2f;
        speed += (vT - speed) * (1f - Mathf.Exp(-dt / tau));

        // Shallow water and shore slow you, and push you back off if you run at them.
        float here = DepthAt(pos.x + f.x * 9f, pos.z + f.z * 9f);
        if (here < 0.3f)
        {
            float k = Mathf.Clamp01((0.3f - here) / 0.05f);
            speed = Mathf.MoveTowards(speed, 3f, dt * 26f * k);
            float e = 6f;
            float gx = DepthAt(pos.x + e, pos.z) - DepthAt(pos.x - e, pos.z);
            float gz = DepthAt(pos.x, pos.z + e) - DepthAt(pos.x, pos.z - e);
            var g = new Vector3(gx, 0, gz);
            if (g.sqrMagnitude > 1e-6f) pos += g.normalized * k * 7f * dt;
            if (k > 0.6f && Time.time - lastScrape > 2.4f) { lastScrape = Time.time; Play(clipScrape, 0.35f); shake = Mathf.Max(shake, 0.25f); }
        }

        pos += f * speed * dt;

        // The sail swings across as the wind changes sides, with a slam if it gybes.
        float side = Vector3.Dot(wd, r) >= 0 ? 1f : -1f;
        if (Mathf.Abs(Vector3.Dot(wd, r)) > 0.12f && side != windSide)
        {
            windSide = side;
            if (state != St.Intro && speed > 4f) { Play(clipFlap, 0.5f); }
        }
        float trimOut = Mathf.Lerp(62f, 18f, Mathf.InverseLerp(10f, 160f, ang));
        float swingTarget = -windSide * trimOut;
        float sf = state == St.Intro && autoSpeed >= 0 ? 0f : 1f;
        swingVel += (swingTarget - swing) * 3.2f * dt * sf;
        swingVel *= Mathf.Exp(-dt * 1.7f);
        swing += swingVel * dt;

        // How much wind it holds.
        float windy = Mathf.InverseLerp(172f, 118f, ang);
        float fillTarget = autoSpeed == 0f ? 0.06f : Mathf.Lerp(0.2f, 1f, windy);
        fill = Mathf.MoveTowards(fill, fillTarget, dt * (fillTarget > fill ? 1.9f : 0.9f));
        float luffTarget = autoSpeed == 0f ? 1f : Mathf.Lerp(1.1f, 0.03f, windy);
        luff = Mathf.MoveTowards(luff, luffTarget, dt * 2.2f);

        // Heel: she leans away from the wind, and outward as she turns. A soft spring, so she overshoots and settles.
        float heelTarget = windSide * -9f * fill * Mathf.Clamp01(speed / 10f) * Mathf.Sin(Mathf.Clamp(ang, 0, 180) * Mathf.Deg2Rad);
        heelTarget += -yawRate * Mathf.Clamp01(speed / 8f) * 0.56f;
        heelVel += (heelTarget - heel) * 5.5f * dt;
        heelVel *= Mathf.Exp(-dt * 2.1f);
        heel += heelVel * dt;
    }
    float lastScrape;

    void SyncBoat(float dt)
    {
        var f = Fwd(); var r = Right();
        float t = Time.time;
        // Sampling at four corners makes her ride the swell instead of sitting on one point of it.
        float hB = SeaHeight(pos.x + f.x * 8f, pos.z + f.z * 8f, t), hS = SeaHeight(pos.x - f.x * 8f, pos.z - f.z * 8f, t);
        float hL = SeaHeight(pos.x - r.x * 2.8f, pos.z - r.z * 2.8f, t), hR = SeaHeight(pos.x + r.x * 2.8f, pos.z + r.z * 2.8f, t);
        float h = (hB + hS + hL + hR) * 0.25f;
        float pitchT = Mathf.Atan2(hB - hS, 16f) * Mathf.Rad2Deg * 0.9f + speed * 0.09f;
        float rollT = Mathf.Atan2(hR - hL, 5.6f) * Mathf.Rad2Deg * 0.35f;
        heaveVel += (h - heave) * 22f * dt; heaveVel *= Mathf.Exp(-dt * 5f); heave += heaveVel * dt;
        pitchVel += (pitchT - pitch) * 16f * dt; pitchVel *= Mathf.Exp(-dt * 4f); pitch += pitchVel * dt;
        rollVel += (rollT - roll) * 14f * dt; rollVel *= Mathf.Exp(-dt * 3.2f); roll += rollVel * dt;
        boat.position = new Vector3(pos.x, heave, pos.z);
        boat.rotation = Quaternion.Euler(0, heading, 0) * Quaternion.Euler(-pitch, 0, -(heel * lerpMotion + roll));

        if (yardPivot) yardPivot.localRotation = Quaternion.Euler(0, swing, 0);
        sailMat.SetFloat("_Fill", -windSide * Mathf.Lerp(0.04f, 1f, fill));
        sailMat.SetFloat("_Luff", luff);
        if (rudder) rudder.localRotation = Quaternion.Euler(0, -rudderPos * 22f, 0);
        if (pennant)
        {
            // The pennant streams downwind, whichever way the boat points.
            var wd = new Vector3(windDir.x, 0, windDir.y);
            pennant.rotation = Quaternion.LookRotation(-(wd * 1.4f - Fwd() * speed * 0.1f).normalized * -1f, Vector3.up) * Quaternion.Euler(0, 180, 0);
        }
        if (sheet)
        {
            Vector3 a = clew.position, b = sheetFoot.position;
            sheet.position = (a + b) * 0.5f;
            var d = b - a;
            sheet.rotation = Quaternion.FromToRotation(Vector3.up, d.normalized);
            sheet.localScale = new Vector3(0.11f, d.magnitude * 0.5f, 0.11f);
        }
    }
    float lerpMotion => Mathf.Lerp(0.35f, 1f, motion);

    // ------------------------------------------------------------------------------------------------ foam
    void Wake(float dt)
    {
        var f = Fwd(); var r = Right();
        wakeClock -= dt;
        float now = Time.time;
        if (wakeClock <= 0)
        {
            wakeClock = 0.11f;
            wakeHead = (wakeHead + 1) % WakeN;
            wakeCount = Mathf.Min(wakeCount + 1, WakeN);
            float str = Mathf.Clamp01(speed / 13f);
            float sideFlex = Mathf.Clamp01(speed / 7f);
            armL[wakeHead] = new WakeS { p = pos + f * 6f - r * 2.2f, side = -r, born = now, str = str };
            armR[wakeHead] = new WakeS { p = pos + f * 6f + r * 2.2f, side = r, born = now, str = str };
            mid[wakeHead] = new WakeS { p = pos - f * 10.5f, side = r, born = now, str = str * sideFlex * 0.78f };
        }
        wv.Clear(); wc.Clear(); wu.Clear(); wi.Clear();
        // Live heads, so the ribbons reach right up to the hull between samples.
        Ribbon(armL, now, 8.5f, 3.1f, 0.42f, 0.46f, pos + f * 8f - r * 1.2f, -r);
        Ribbon(armR, now, 8.5f, 3.1f, 0.42f, 0.46f, pos + f * 8f + r * 1.2f, r);
        Ribbon(mid, now, 7f, 0f, 1.5f, 0.8f, pos - f * 9f, r);
        wakeMesh.Clear(false);
        wakeMesh.SetVertices(wv);
        wakeMesh.SetColors(wc);
        wakeMesh.SetUVs(0, wu);
        wakeMesh.SetTriangles(wi, 0, false);
        wakeMesh.bounds = new Bounds(pos, Vector3.one * 2000f);

        // Spray off the bow once she's moving, and a boil under the stern.
        if (speed > 7f && spray)
        {
            float rate = (speed - 7f) * 1.4f;
            if (UnityEngine.Random.value < rate * dt * 4f)
            {
                for (int s = -1; s <= 1; s += 2)
                {
                    var ep = new ParticleSystem.EmitParams();
                    ep.position = pos + f * UnityEngine.Random.Range(6.5f, 9.5f) + r * s * UnityEngine.Random.Range(1.3f, 2.2f) + Vector3.up * (heave + 0.5f);
                    ep.velocity = f * speed * 0.55f + r * s * UnityEngine.Random.Range(2f, 6f) + Vector3.up * UnityEngine.Random.Range(1.5f, 2.2f + speed * 0.32f);
                    ep.startSize = UnityEngine.Random.Range(0.5f, 1.5f);
                    ep.startLifetime = UnityEngine.Random.Range(0.35f, 0.8f);
                    spray.Emit(ep, 1);
                }
            }
            // When the bow drops into a wave she throws a bigger sheet.
            if (pitchVel < -1.8f && Time.time - lastSlap > 1.6f && speed > 11f)
            {
                lastSlap = Time.time;
                Play(clipSlap, 0.4f);
                shake = Mathf.Max(shake, 0.15f);
                for (int n = 0; n < 18; n++)
                {
                    int s = n % 2 == 0 ? -1 : 1;
                    var ep = new ParticleSystem.EmitParams();
                    ep.position = pos + f * UnityEngine.Random.Range(5f, 10f) + r * s * UnityEngine.Random.Range(0.8f, 2.4f) + Vector3.up * (heave + 0.6f);
                    ep.velocity = f * speed * 0.6f + r * s * UnityEngine.Random.Range(2f, 9f) + Vector3.up * UnityEngine.Random.Range(3f, 9f);
                    ep.startSize = UnityEngine.Random.Range(0.7f, 2.0f);
                    ep.startLifetime = UnityEngine.Random.Range(0.4f, 0.95f);
                    spray.Emit(ep, 1);
                }
            }
        }
        if (churn && speed > 2f && UnityEngine.Random.value < dt * 12f)
        {
            var ep = new ParticleSystem.EmitParams();
            ep.position = pos - f * UnityEngine.Random.Range(9f, 11.5f) + r * UnityEngine.Random.Range(-1.4f, 1.4f) + Vector3.up * (heave + 0.1f);
            ep.velocity = f * speed * 0.25f + r * UnityEngine.Random.Range(-1.5f, 1.5f) + Vector3.up * UnityEngine.Random.Range(0.4f, 1.3f);
            ep.startSize = UnityEngine.Random.Range(1f, 2.6f);
            ep.startLifetime = UnityEngine.Random.Range(0.5f, 0.9f);
            churn.Emit(ep, 1);
        }
    }
    float lastSlap;

    void Ribbon(WakeS[] ring, float now, float life, float spread, float baseW, float grow, Vector3 head, Vector3 headSide)
    {
        int start = wv.Count;
        void Add(Vector3 c, Vector3 side, float halfW, float a)
        {
            wv.Add(c - side * halfW); wv.Add(c + side * halfW);
            var col = new Color(1, 1, 1, a);
            wc.Add(col); wc.Add(col);
            wu.Add(new Vector2(-1, 0)); wu.Add(new Vector2(1, 0));
        }
        Add(head, headSide, baseW * 0.6f, Mathf.Clamp01(speed / 13f));
        int quads = 0;
        for (int i = 0; i < wakeCount; i++)
        {
            ref var s = ref ring[(wakeHead - i + WakeN * 2) % WakeN];
            float age = now - s.born;
            if (age > life) break;
            float k = age / life;
            var c = s.p + s.side * (age * spread);
            float a = s.str * (1f - k) * (1f - k * 0.5f);
            Add(c, s.side, baseW + age * grow * 0.5f, a);
            quads++;
        }
        for (int q = 0; q < quads; q++)
        {
            int a = start + q * 2;
            wi.Add(a); wi.Add(a + 1); wi.Add(a + 2);
            wi.Add(a + 1); wi.Add(a + 3); wi.Add(a + 2);
        }
    }

    // ------------------------------------------------------------------------------------------------ the guide
    int NearestUnvisited()
    {
        if (firstIsland >= 0 && !visited[firstIsland]) return firstIsland;
        int best = -1; float bd = 1e9f;
        for (int i = 0; i < 3; i++)
        {
            if (visited[i]) continue;
            float d = new Vector2(islands[i].x - pos.x, islands[i].z - pos.z).magnitude;
            // A bias for what's ahead, so she doesn't turn you around for an island that's just behind.
            var to = new Vector3(islands[i].x - pos.x, 0, islands[i].z - pos.z).normalized;
            d *= 1.25f - 0.25f * Vector3.Dot(to, Fwd());
            if (i == nextIsland) d *= 0.8f;
            if (d < bd) { bd = d; best = i; }
        }
        return best;
    }

    void Bird(float dt)
    {
        if (perched || state == St.Done && finaleLanded)
        {
            bird.position = mastTop.position + Vector3.up * 0.55f;
            bird.rotation = Quaternion.Euler(0, heading + 12f, 0);
            birdPos = bird.position; birdVel = Vector3.zero;
            float d = Mathf.Sin(Time.time * 2.3f) * 2f;
            wingL.localRotation = Base * Quaternion.Euler(0, -84, 14);
            wingR.localRotation = Base * Quaternion.Euler(0, 84, -14);
            wingL.localScale = wingR.localScale = Vector3.one * 0.62f;
            birdTail.localRotation = Base * Quaternion.Euler(14 + d, 0, 0);
            birdCrest.localRotation = Base * Quaternion.Euler(Mathf.Sin(Time.time * 0.9f) * 6f, 0, 0);
            if (birdTrail) birdTrail.emitting = false;
            return;
        }
        if (birdTrail) birdTrail.emitting = true;

        nextIsland = NearestUnvisited();
        Vector3 target;
        var f = Fwd();
        if (finaleFlyHome)
        {
            target = mastTop.position + Vector3.up * 0.55f;
        }
        else if (nextIsland < 0 || state == St.Finale)
        {
            // Nowhere left to lead: she circles the boat.
            float a = Time.time * 0.8f;
            target = pos + new Vector3(Mathf.Cos(a), 0, Mathf.Sin(a)) * 20f + Vector3.up * 15f;
        }
        else
        {
            var isl = new Vector3(islands[nextIsland].x, 0, islands[nextIsland].z);
            var to = isl - pos; to.y = 0;
            float dist = to.magnitude;
            var dir = to / Mathf.Max(dist, 1f);
            // She leads ahead, staying where you can see her, and pulls further towards the way when you've wandered.
            var lead = Vector3.Slerp(f, dir, 0.72f).normalized;
            float aheadBy = Mathf.Clamp(dist - 40f, 18f, 46f);
            target = pos + lead * aheadBy + Vector3.up * (20f + Mathf.Sin(Time.time * 0.7f) * 3f);
            target += Right() * (-windSide * 13f + Mathf.Sin(Time.time * 0.43f) * 5f);
        }
        var want = (target - birdPos);
        var acc = want * 1.9f - birdVel * 1.5f;
        birdVel += acc * dt;
        birdPos += birdVel * dt;
        if (finaleFlyHome && (target - birdPos).magnitude < 1.4f)
        {
            perched = true;
            finaleFlyHome = false;
            finaleLanded = true;
            Play(clipHoopoe, 0.4f);
        }

        // Wings: she beats while climbing or catching up and glides when she can, as a real bird does.
        float effort = Mathf.Clamp01((birdVel.y + 2f) * 0.2f + (want.magnitude - 10f) * 0.06f);
        float beat = Mathf.Lerp(0.22f, 1f, effort) * (0.55f + 0.45f * Mathf.Abs(Mathf.Sin(Time.time * 0.6f)));
        birdPhase += dt * Mathf.Lerp(6f, 15f, beat);
        float flap = Mathf.Sin(birdPhase) * Mathf.Lerp(7f, 46f, beat) - 8f;
        var fwd = birdVel.sqrMagnitude > 0.5f ? birdVel.normalized : f;
        var flat = new Vector3(fwd.x, 0, fwd.z).normalized;
        float turn = Vector3.SignedAngle(new Vector3(bird.forward.x, 0, bird.forward.z), flat, Vector3.up);
        birdBank = Mathf.Lerp(birdBank, Mathf.Clamp(-turn * 6f, -38, 38), 1 - Mathf.Exp(-dt * 3f));
        var look = Quaternion.LookRotation(fwd + Vector3.up * 0.05f, Vector3.up);
        bird.position = birdPos + Vector3.up * Mathf.Sin(birdPhase) * 0.09f;
        bird.rotation = Quaternion.Slerp(bird.rotation, look * Quaternion.Euler(0, 0, birdBank), 1 - Mathf.Exp(-dt * 7f));
        wingL.localRotation = Base * Quaternion.Euler(0, 0, -flap);
        wingR.localRotation = Base * Quaternion.Euler(0, 0, flap);
        wingL.localScale = wingR.localScale = Vector3.one;
        birdTail.localRotation = Base * Quaternion.Euler(Mathf.Clamp(birdVel.y * 2.6f, -22, 22), 0, 0);
        birdCrestUp = Mathf.Lerp(birdCrestUp, Mathf.Sin(Time.time * 0.31f) > 0.8f ? 1f : 0f, 1 - Mathf.Exp(-dt * 4f));
        birdCrest.localRotation = Base * Quaternion.Euler(Mathf.Lerp(16f, -14f, birdCrestUp), 0, 0);
    }
    static readonly Quaternion Base = Quaternion.Euler(0, 180, 0);
    bool finaleFlyHome, finaleLanded;

    // ------------------------------------------------------------------------------------------------ arrivals
    void ArrivalCheck()
    {
        if (state != St.Sail) return;
        for (int i = 0; i < 3; i++)
        {
            if (visited[i]) continue;
            float d = new Vector2(islands[i].x - pos.x, islands[i].z - pos.z).magnitude;
            if (d < islands[i].y * ArriveAt[i])
            {
                visited[i] = true;
                visitedCount++;
                moment = StartCoroutine(i == 0 ? Beautiful() : i == 1 ? Research() : Play());
                return;
            }
        }
    }
    static readonly float[] ArriveAt = { 0.86f, 0.9f, 0.9f };
    static readonly string[] IslandId = { "beautiful", "research", "play" };

    static float DuskFor(int found) => found <= 1 ? 0.2f : found == 2 ? 0.42f : 0.66f;

    void Helm(int i)
    {
        // Ease her round along the shore while the moment plays.
        var c = new Vector3(islands[i].x, 0, islands[i].z);
        var toC = (c - pos).normalized;
        var tan = Vector3.Cross(Vector3.up, toC);
        if (Vector3.Dot(tan, Fwd()) < 0) tan = -tan;
        autoHelm = true;
        autoHeading = Mathf.Atan2(tan.x, tan.z) * Mathf.Rad2Deg;
        autoSpeed = 8.5f;
        steerLocked = true;
    }

    void Release()
    {
        autoHelm = false;
        autoSpeed = -1f;
        steerLocked = false;
        shotTarget = 0f;
        shotBlend = 2.2f;
        pointerStart = Input.mousePosition;
        pointerLive = false;
        state = St.Sail;
        Send("state", "sail");
        if (visitedCount >= 3) StartCoroutine(Finale());
    }

    void SetShot(Vector3 p, Vector3 l, float fov, float blend)
    {
        shotFrom = cam.transform.position;
        shotFromLook = camLook;
        shotPos = p; shotLook = l; shotFov = fov; shotBlend = blend;
        shotTarget = 1f;
    }

    // Stand off beyond the boat and look across it at the landmark, picking the side that keeps the sun at a good angle.
    void ShotFor(int i, Vector3 focus, float back, float up, float fov, float blend)
    {
        var to = (focus - pos); to.y = 0; to.Normalize();
        var sunF = new Vector3(_sunF.x, 0, _sunF.z).normalized;
        var side = Vector3.Cross(Vector3.up, to);
        if (Vector3.Dot(side, sunF) > 0) side = -side;
        var p = pos - to * back + side * back * 0.46f + Vector3.up * up;
        SetShot(p, (focus * 0.72f + (pos + Vector3.up * 8f) * 0.28f), fov, blend);
    }
    Vector3 _sunF = new Vector3(0.4f, 0.1f, 0.9f);

    IEnumerator Beautiful()
    {
        state = St.Moment;
        Send("state", "moment");
        Send("arrive", IslandId[0]);
        Helm(0);
        duskTarget = DuskFor(visitedCount);
        var top = new Vector3(islands[0].x, 72f, islands[0].z);
        ShotFor(0, top, 118f, 12f, 40f, 2.2f);
        Music(clipBeautiful, 0.8f);
        yield return new WaitForSeconds(0.5f);
        // The light opens up: rays through the cloud, and every blossom on the island comes out at once.
        gloryTarget = 1f;
        foreach (var s in shafts) s.gameObject.SetActive(true);
        float t = 0;
        bool started = false;
        while (t < 4.2f)
        {
            t += Time.deltaTime;
            float k = Mathf.Clamp01(t / 3.6f);
            float over = 1f + Mathf.Sin(k * Mathf.PI) * 0.12f;
            bloom = Mathf.SmoothStep(0, 1, k) * over;
            if (t > 1.0f && !started)
            {
                started = true;
                // Blown off the tree, across the water and past the camera.
                var em = petals.emission; em.enabled = true; em.rateOverTime = 170f;
                var near0 = Vector3.Lerp(new Vector3(islands[0].x, 40f, islands[0].z), cam.transform.position, 0.72f);
                petals.transform.position = near0 + Vector3.up * 8f;
                petals.Play();
            }
            yield return null;
        }
        bloom = 1f;
        yield return new WaitForSeconds(3.6f);
        gloryTarget = 0.18f;
        var em2 = petals.emission; em2.rateOverTime = 30f;
        yield return new WaitForSeconds(0.6f);
        Send("leave", IslandId[0]);
        Release();
        yield return new WaitForSeconds(6f);
        foreach (var s in shafts) s.gameObject.SetActive(false);
        gloryTarget = 0f;
        em2.rateOverTime = 8f;
    }

    IEnumerator Research()
    {
        state = St.Moment;
        Send("state", "moment");
        Send("arrive", IslandId[1]);
        Helm(1);
        duskTarget = DuskFor(visitedCount);
        var isl = new Vector3(islands[1].x, 50f, islands[1].z);
        ShotFor(1, lampPos * 0.55f + isl * 0.45f, 62f, 11f, 44f, 2.0f);
        Music(clipResearch, 0.8f);
        // The lamp lights, the beam comes round, and the observatory opens its dome.
        yield return new WaitForSeconds(0.6f);
        beamA.gameObject.SetActive(true);
        beamB.gameObject.SetActive(true);
        float t = 0;
        while (t < 2.6f)
        {
            t += Time.deltaTime;
            float k = Mathf.Clamp01(t / 2.2f);
            beamOn = Mathf.SmoothStep(0, 1, k);
            lampGlow = beamOn;
            domeOpen = Mathf.SmoothStep(0, 1, Mathf.Clamp01((t - 0.6f) / 1.8f));
            yield return null;
        }
        // The chart spreads across the sea from the lighthouse, with a route laid to each island still to come.
        Send("chart", "");
        Play(clipDing, 0.5f);
        int n = 0;
        for (int i = 0; i < 3; i++) routes[i] = Vector4.zero;
        var here = new Vector2(lampPos.x, lampPos.z);
        var towards = Vector3.zero;
        for (int i = 0; i < 3; i++)
        {
            if (visited[i]) continue;
            var dest = new Vector2(islands[i].x, islands[i].z);
            var d = (dest - here).normalized;
            float R = islands[i].y * 0.84f;
            routes[n++] = new Vector4(here.x + d.x * 60f, here.y + d.y * 60f, dest.x - d.x * R, dest.y - d.y * R);
            towards += new Vector3(islands[i].x, 0, islands[i].z);
        }
        if (n == 0) towards = new Vector3(ShoreCX, 0, ShoreCZ); else towards /= n;
        Shader.SetGlobalVectorArray("_Routes", routes);
        Shader.SetGlobalVector("_ChartC", lampPos);
        // The camera climbs until the whole chart is laid out below, then looks across it to wherever's left to go.
        var from = shotPos; var fromLook = shotLook; float fromFov = shotFov;
        var lamp0 = new Vector3(lampPos.x, 0, lampPos.z);
        var across = towards - lamp0; across.y = 0;
        if (across.sqrMagnitude < 1f) across = Vector3.forward;
        across.Normalize();
        var high = lamp0 - across * 210f + Vector3.up * 165f;
        var highLook = lamp0 + across * 430f;
        t = 0;
        while (t < 6.4f)
        {
            t += Time.deltaTime;
            float k = Mathf.SmoothStep(0, 1, Mathf.Clamp01(t / 3.4f));
            shotPos = Vector3.Lerp(from, high, k);
            shotLook = Vector3.Lerp(fromLook, highLook, k);
            shotFov = Mathf.Lerp(fromFov, 54f, k);
            chartR = Mathf.Lerp(0, 1500f, 1 - Mathf.Pow(1 - Mathf.Clamp01(t / 4.8f), 2.2f));
            chartFade = Mathf.Clamp01(t / 0.5f);
            routeFade = Mathf.Clamp01(t / 3.2f);
            yield return null;
        }
        Send("leave", IslandId[1]);
        Release();
        // The rings fade, and the routes stay until there's nothing left to find.
        t = 0;
        while (t < 6f)
        {
            t += Time.deltaTime;
            chartFade = 1 - Mathf.Clamp01(t / 6f);
            routeFade = Mathf.Lerp(1f, 0.6f, Mathf.Clamp01(t / 6f));
            yield return null;
        }
        chartR = 0;
    }

    IEnumerator Play()
    {
        state = St.Moment;
        Send("state", "moment");
        Send("arrive", IslandId[2]);
        Helm(2);
        duskTarget = DuskFor(visitedCount);
        ShotFor(2, new Vector3(wheelPos.x, 30f, wheelPos.z), 70f, 9f, 44f, 2.0f);
        Music(clipPlay, 0.75f);
        // The big bell swings, the fairground wakes up, and the fish start to jump. Tapping joins in.
        bellVel = 90f;
        Play(clipBell, 0.8f);
        wheelSpeed = 30f;
        pinSpeed = 240f;
        canJump = true;
        Send("tap", "1");
        float t = 0;
        float nextFish = 0.5f;
        float nextFire = 2.0f;
        while (t < 9f)
        {
            t += Time.deltaTime;
            if (t > nextFish && t < 7.5f)
            {
                nextFish = t + UnityEngine.Random.Range(0.42f, 0.72f);
                LaunchFish(t * 1.4f);
            }
            if (t > nextFire && t < 8f)
            {
                nextFire = t + UnityEngine.Random.Range(0.7f, 1.3f);
                StartCoroutine(Firework(new Vector3(islands[2].x + UnityEngine.Random.Range(-70f, 70f), 8f, islands[2].z + UnityEngine.Random.Range(-70f, 30f)), UnityEngine.Random.Range(48f, 92f)));
            }
            yield return null;
        }
        Send("tap", "0");
        Send("leave", IslandId[2]);
        Release();
    }

    void LaunchFish(float angle)
    {
        for (int i = 0; i < fish.Length; i++)
        {
            if (fishT[i] >= 0) continue;
            // They leap in the middle of the view, whatever the camera is looking at, each crossing it the other way from the last.
            var view = cam.transform.forward; view.y = 0; view.Normalize();
            var across = Vector3.Cross(Vector3.up, view);
            var mid = cam.transform.position + view * 58f; mid.y = 0;
            float dir = (noteIndex & 1) == 0 ? 1 : -1;
            var a = mid + view * UnityEngine.Random.Range(-14f, 14f) + across * UnityEngine.Random.Range(-30f, 30f);
            var b = a + (across * dir + view * UnityEngine.Random.Range(-0.25f, 0.25f)).normalized * UnityEngine.Random.Range(13f, 22f);
            fishA[i] = a; fishB[i] = b; fishDur[i] = UnityEngine.Random.Range(1.05f, 1.35f); fishT[i] = 0;
            fish[i].localScale = Vector3.one * UnityEngine.Random.Range(1.5f, 2.3f);
            fish[i].gameObject.SetActive(true);
            Burst(splash, a, 12);
            if (clipNotes != null && clipNotes.Length > 0)
            {
                // A pentatonic walk, so whatever order they jump in sounds like a tune.
                noteIndex = (noteIndex + UnityEngine.Random.Range(1, 3)) % clipNotes.Length;
                Play(clipNotes[noteIndex], 0.42f);
            }
            return;
        }
    }

    void Burst(ParticleSystem ps, Vector3 at, int n)
    {
        if (!ps) return;
        var ep = new ParticleSystem.EmitParams();
        ep.position = at + Vector3.up * 0.4f;
        ep.applyShapeToPosition = true;
        ps.Emit(ep, n);
    }

    void UpdateFish(float dt)
    {
        for (int i = 0; i < fish.Length; i++)
        {
            if (fishT[i] < 0) continue;
            fishT[i] += dt / fishDur[i];
            float k = fishT[i];
            if (k >= 1)
            {
                Burst(splash, fishB[i], 16);
                if (Vector3.Distance(fishB[i], pos) < 60f) Play(clipSplash, 0.22f);
                fishT[i] = -1;
                fish[i].gameObject.SetActive(false);
                continue;
            }
            var p = Vector3.Lerp(fishA[i], fishB[i], k);
            float h = 4f * k * (1 - k) * 10f;
            p.y = h - 0.6f;
            var d = (fishB[i] - fishA[i]).normalized;
            float slope = (1 - 2 * k) * 4f * 10f / Vector3.Distance(fishA[i], fishB[i]);
            fish[i].position = p;
            fish[i].rotation = Quaternion.LookRotation(d + Vector3.up * slope, Vector3.up) * Base;
        }
    }

    IEnumerator Firework(Vector3 from, float height)
    {
        Play(clipLaunch, 0.25f);
        float t = 0, dur = UnityEngine.Random.Range(0.8f, 1.15f);
        var top = from + Vector3.up * height + new Vector3(UnityEngine.Random.Range(-14f, 14f), 0, UnityEngine.Random.Range(-14f, 14f));
        while (t < dur)
        {
            t += Time.deltaTime;
            float k = 1 - (1 - t / dur) * (1 - t / dur);
            var ep = new ParticleSystem.EmitParams { position = Vector3.Lerp(from, top, k), velocity = UnityEngine.Random.insideUnitSphere * 1.2f, startSize = 1.2f, startLifetime = 0.45f, startColor = new Color(2.6f, 1.9f, 1.1f, 1f) };
            sparks.Emit(ep, 1);
            yield return null;
        }
        // A burst of three colours from the site's world: pink, gold and sea-green, pushed bright for the bloom.
        Color[] sets = { new Color(3.6f, 0.28f, 1.05f, 1), new Color(3.6f, 1.9f, 0.32f, 1), new Color(0.3f, 3.2f, 2.1f, 1), new Color(2.8f, 2.4f, 1.8f, 1) };
        var c = sets[UnityEngine.Random.Range(0, sets.Length)];
        var c2 = sets[UnityEngine.Random.Range(0, sets.Length)];
        int n = lite ? 70 : 150;
        float spd = UnityEngine.Random.Range(22f, 32f);
        for (int i = 0; i < n; i++)
        {
            var d = UnityEngine.Random.onUnitSphere;
            var ep = new ParticleSystem.EmitParams
            {
                position = top,
                velocity = d * spd * UnityEngine.Random.Range(0.85f, 1.05f),
                startSize = UnityEngine.Random.Range(2.2f, 3.8f),
                startLifetime = UnityEngine.Random.Range(1.5f, 2.3f),
                startColor = i % 3 == 0 ? c2 : c,
            };
            sparks.Emit(ep, 1);
        }
        flash = Mathf.Min(flash + 0.7f, 1.2f);
        float delay = Mathf.Clamp(Vector3.Distance(top, pos) / 340f * 0.35f, 0.02f, 0.5f);
        yield return new WaitForSeconds(delay);
        Play(clipPop, 0.45f);
    }

    IEnumerator Finale()
    {
        yield return new WaitForSeconds(1.2f);
        state = St.Finale;
        steerLocked = true;
        Send("state", "finale");
        duskTarget = 1f;
        // Turn for the sun and go home in the last of the light.
        var sunF = new Vector3(Mathf.Sin(SunAz * Mathf.Deg2Rad), 0, Mathf.Cos(SunAz * Mathf.Deg2Rad));
        autoHelm = true;
        autoHeading = SunAz + 14f;
        autoSpeed = 9f;
        Music(clipFinale, 0.9f);
        // Lanterns rise from all three islands as she comes round.
        if (lanterns)
        {
            var em = lanterns.emission;
            em.enabled = true;
            lanterns.Play();
        }
        routeFade = 0;
        float t = 0;
        Vector3 f0 = Fwd();
        var startCamLook = camLook;
        shotTarget = 1f;
        shotBlend = 4.2f;
        float nextFire = 3f;
        bool told = false;
        while (true)
        {
            t += Time.deltaTime;
            var fwd = Fwd(); var right = Right();
            // A slow rising pull-back that ends with the boat small against the sun and the whole archipelago around her.
            float k = Mathf.SmoothStep(0, 1, Mathf.Clamp01(t / 14f));
            var p = pos - fwd * Mathf.Lerp(26f, 112f, k) + right * Mathf.Lerp(20f, -24f, k) + Vector3.up * Mathf.Lerp(6f, 30f, k);
            shotPos = p;
            shotLook = pos + Vector3.up * Mathf.Lerp(9f, 3f, k) + fwd * Mathf.Lerp(0, 60f, k);
            shotFov = Mathf.Lerp(44f, 44f, k);
            if (t > nextFire && t < 15f)
            {
                nextFire = t + UnityEngine.Random.Range(0.6f, 1.6f);
                var isl = islands[UnityEngine.Random.Range(0, 3)];
                var side = new Vector3(UnityEngine.Random.Range(-280f, 280f), 2f, UnityEngine.Random.Range(60f, 420f));
                StartCoroutine(Firework(pos + fwd * side.z + right * side.x, UnityEngine.Random.Range(70f, 140f)));
            }
            if (t > 2.4f && !finaleLanded && !finaleFlyHome) finaleFlyHome = true;
            if (t > 6.0f && !told)
            {
                told = true;
                state = St.Done;
                Send("state", "done");
                Send("done", "");
            }
            yield return null;
        }
    }

    // ------------------------------------------------------------------------------------------------ everything that keeps moving
    void Effects(float dt)
    {
        dusk = Mathf.MoveTowards(dusk, duskTarget, dt * (state == St.Finale || state == St.Done ? 0.085f : 0.05f));
        glory = Mathf.MoveTowards(glory, gloryTarget, dt * 0.5f);
        if (bloomFx) bloomFx.intensity.value = 0.55f + glory * 0.5f;
        if (gradeFx) gradeFx.postExposure.value = 0.05f + glory * 0.12f;
        ApplyPalette(dusk);
        blossomMat.SetFloat("_Open", bloom);
        flowersMat.SetFloat("_Open", Mathf.Clamp01(bloom * 1.1f));

        // Lamps come up as the light goes down.
        lampMat.SetFloat("_Emit", 2.5f + lampGlow * 18f);
        if (boatLampMat) boatLampMat.SetFloat("_Emit", 0.8f + dusk * 7f);

        // Fairground.
        wheelAngle += wheelSpeed * dt;
        if (wheel)
        {
            wheel.rotation = Quaternion.Euler(0, 0, wheelAngle) * Base;
            for (int i = 0; i < gondolas.Length; i++)
            {
                float a = (i / (float)gondolas.Length) * 360f + wheelAngle;
                float rad = 18.5f;
                var off = new Vector3(Mathf.Cos(a * Mathf.Deg2Rad) * rad, Mathf.Sin(a * Mathf.Deg2Rad) * rad, 0);
                gondolas[i].position = wheelPos + off;
            }
        }
        pinAngle += pinSpeed * dt;
        for (int i = 0; i < pinwheels.Length; i++)
            pinwheels[i].rotation = Quaternion.Euler(0, 0, pinAngle * (i % 2 == 0 ? 1 : -1) + i * 37f) * Base;
        wheelSpeed = Mathf.MoveTowards(wheelSpeed, visited[2] ? 14f : 7f, dt * 2f);
        pinSpeed = Mathf.MoveTowards(pinSpeed, visited[2] ? 120f : 40f, dt * 16f);
        // Kites on their strings, always a little restless.
        for (int i = 0; i < kites.Length; i++)
        {
            float s = Time.time * (0.5f + 0.13f * i) + i * 2.1f;
            var k = kites[i];
            var basePos = kiteHome(i);
            k.position = basePos + new Vector3(Mathf.Sin(s) * 5f, Mathf.Sin(s * 1.7f) * 3.2f, Mathf.Cos(s * 0.8f) * 3f);
            k.rotation = Quaternion.Euler(Mathf.Sin(s * 1.3f) * 12f, Mathf.Sin(s) * 18f, Mathf.Sin(s * 0.9f) * 22f) * Base;
            var a = kiteAnchors[i];
            var b = k.position;
            var st = kiteStrings[i];
            st.position = (a + b) * 0.5f;
            st.rotation = Quaternion.FromToRotation(Vector3.up, (b - a).normalized);
            st.localScale = new Vector3(0.14f, (b - a).magnitude * 0.5f, 0.14f);
        }
        // The bell.
        bellVel += -bellSwing * 9f * dt;
        bellVel *= Mathf.Exp(-dt * 0.8f);
        bellSwing += bellVel * dt;
        if (bell) bell.rotation = Quaternion.Euler(0, 0, bellSwing) * Base;

        // The observatory.
        if (domeL)
        {
            domeL.rotation = Quaternion.Euler(0, 0, -domeOpen * 70f) * Base;
            domeR.rotation = Quaternion.Euler(0, 0, domeOpen * 70f) * Base;
            telescope.rotation = Quaternion.Euler(Mathf.Lerp(0f, -22f, domeOpen), 0, 0) * Base;
            telescope.localScale = Vector3.one * Mathf.Lerp(0.7f, 1.2f, domeOpen);
        }
        // The lighthouse.
        if (beamA && beamA.gameObject.activeSelf)
        {
            beamAngle += dt * 26f;
            var rot = Quaternion.Euler(0, beamAngle, 0) * Quaternion.Euler(2.5f, 0, 0);
            beamA.SetPositionAndRotation(lampPos, rot);
            beamB.SetPositionAndRotation(lampPos, Quaternion.Euler(0, beamAngle + 180f, 0) * Quaternion.Euler(2.5f, 0, 0));
            var col = new Color(1f, 0.88f, 0.62f, beamOn * Mathf.Lerp(0.24f, 0.5f, dusk));
            beamMat.SetColor("_Color", col);
        }
        // Shafts through the clouds.
        if (shafts.Length > 0 && shafts[0].gameObject.activeSelf) shaftMat.SetColor("_Color", new Color(1f, 0.76f, 0.46f, glory * 0.3f));
        // Flash from fireworks.
        flash = Mathf.MoveTowards(flash, 0, dt * 1.6f);
        Shader.SetGlobalFloat("_Flash", flash);
        Shader.SetGlobalFloat("_Chart", chartR);
        Shader.SetGlobalFloat("_ChartFade", chartFade);
        Shader.SetGlobalFloat("_RouteFade", state == St.Finale || state == St.Done ? 0 : routeFade);
        UpdateFish(dt);
        Gulls();
    }

    Vector3 kiteHome(int i) => kiteAnchors[i] + new Vector3((kiteAnchors[i].x - islands[2].x) * 0.6f, 62f + i * 8f, (kiteAnchors[i].z - islands[2].z) * 0.6f);

    void Gulls()
    {
        if (gulls == null) return;
        for (int i = 0; i < gulls.Length; i++)
        {
            int isl = i % 3;
            float rad = islands[isl].y * (0.72f + 0.1f * (i % 4));
            float a = Time.time * (0.08f + 0.012f * (i % 5)) * (i % 2 == 0 ? 1 : -1) + i * 1.7f;
            var c = new Vector3(islands[isl].x, 36f + (i % 6) * 7f + Mathf.Sin(Time.time * 0.3f + i) * 3f, islands[isl].z);
            var p = c + new Vector3(Mathf.Cos(a), 0, Mathf.Sin(a)) * rad;
            var v = new Vector3(-Mathf.Sin(a), 0, Mathf.Cos(a)) * (i % 2 == 0 ? 1 : -1);
            gulls[i].SetPositionAndRotation(p, Quaternion.LookRotation(v, Vector3.up) * Quaternion.Euler(0, 180, i % 2 == 0 ? 20 : -20));
        }
    }

    // ------------------------------------------------------------------------------------------------ time of day
    // Colours are sRGB hex. Index 0 is the golden hour, and the sky runs through to the end of the sunset.
    static readonly string[] PZen = { "#1a5f85", "#154a78", "#0e2f63", "#0b1a44" };
    static readonly string[] PMid = { "#78b4c0", "#7ea0b8", "#7a78a4", "#3f3a70" };
    static readonly string[] PHorSun = { "#ffd28c", "#ffbc72", "#ff9a58", "#ff6f42" };
    static readonly string[] PHorAnti = { "#eab3a2", "#dd9f9e", "#b47d98", "#54406e" };
    static readonly string[] PAmbUp = { "#7fa6bb", "#7a98b6", "#6c7fac", "#3a4178" };
    static readonly string[] PAmbDown = { "#b89a7a", "#b08a6e", "#99706a", "#50405e" };
    static readonly string[] PDeep = { "#07465c", "#06405a", "#0a3454", "#071a3a" };
    static readonly string[] PTeal = { "#0d8791", "#0d7a8c", "#106a84", "#14406a" };
    static readonly string[] PShallow = { "#39c9b8", "#3ab8ae", "#3a9da4", "#2b5c7e" };
    static readonly string[] PSand = { "#c9d49a", "#bfc495", "#a7a48c", "#59587a" };
    static readonly string[] PFoamLit = { "#fff4e0", "#ffe8cc", "#ffd8c0", "#b8a4b8" };
    static readonly string[] PFoamShade = { "#a9cfd0", "#9fc2c8", "#8aa4bc", "#3f4c78" };
    static readonly Vector3[] PSun = {
        new Vector3(1f, 0.74f, 0.47f), new Vector3(1f, 0.66f, 0.38f), new Vector3(1f, 0.52f, 0.28f), new Vector3(1f, 0.36f, 0.2f)
    };
    static readonly float[] PSunI = { 2.7f, 2.5f, 2.1f, 1.05f };
    static readonly float[] PAlt = { 9.5f, 8f, 5.6f, 1.3f };
    static readonly float[] PFog = { 0.00034f, 0.00036f, 0.0004f, 0.00048f };

    static readonly Dictionary<string, Color> hexCache = new Dictionary<string, Color>();
    static Color Hex(string s)
    {
        if (hexCache.TryGetValue(s, out var known)) return known;
        ColorUtility.TryParseHtmlString(s, out var c);
        return hexCache[s] = c.linear;
    }
    static Color Lerp4(string[] p, float t)
    {
        t = Mathf.Clamp01(t) * 3f;
        int i = Mathf.Min((int)t, 2);
        return Color.Lerp(Hex(p[i]), Hex(p[i + 1]), t - i);
    }
    static float Lerp4(float[] p, float t)
    {
        t = Mathf.Clamp01(t) * 3f;
        int i = Mathf.Min((int)t, 2);
        return Mathf.Lerp(p[i], p[i + 1], t - i);
    }

    public void ApplyPalette(float d)
    {
        float t = Mathf.Clamp01(d) * 3f;
        int i = Mathf.Min((int)t, 2);
        var sc = Vector3.Lerp(PSun[i], PSun[i + 1], t - i) * Lerp4(PSunI, d) * (1f + glory * 0.18f);
        sunAlt = Lerp4(PAlt, d);
        float az = SunAz * Mathf.Deg2Rad, el = sunAlt * Mathf.Deg2Rad;
        var dir = new Vector3(Mathf.Sin(az) * Mathf.Cos(el), Mathf.Sin(el), Mathf.Cos(az) * Mathf.Cos(el));
        _sunF = dir;
        Shader.SetGlobalVector("_SunDir", dir);
        Shader.SetGlobalVector("_SunCol", sc);
        Shader.SetGlobalVector("_Zen", Lerp4(PZen, d));
        Shader.SetGlobalVector("_Mid", Lerp4(PMid, d));
        Shader.SetGlobalVector("_HorSun", Lerp4(PHorSun, d));
        Shader.SetGlobalVector("_HorAnti", Lerp4(PHorAnti, d));
        Shader.SetGlobalVector("_AmbUp", (Vector4)Lerp4(PAmbUp, d) * 1.05f);
        Shader.SetGlobalVector("_AmbDown", (Vector4)Lerp4(PAmbDown, d) * 0.72f);
        Shader.SetGlobalVector("_Deep", Lerp4(PDeep, d));
        Shader.SetGlobalVector("_Teal", Lerp4(PTeal, d));
        Shader.SetGlobalVector("_Shallow", Lerp4(PShallow, d));
        Shader.SetGlobalVector("_SandTint", Lerp4(PSand, d));
        Shader.SetGlobalVector("_FoamLit", Lerp4(PFoamLit, d));
        Shader.SetGlobalVector("_FoamShade", Lerp4(PFoamShade, d));
        Shader.SetGlobalFloat("_FogK", Lerp4(PFog, d));
        Shader.SetGlobalFloat("_Dusk", d);
        Shader.SetGlobalFloat("_Glory", glory);
        sun.transform.rotation = Quaternion.LookRotation(-dir, Vector3.up);
        sun.shadowStrength = Mathf.Lerp(0.85f, 0.35f, Mathf.Clamp01(d));
    }

    public void SetGlobals(float dt)
    {
        Shader.SetGlobalFloat("_SailTime", Time.time);
    }

    public void SetEditorTime(float t) { Shader.SetGlobalFloat("_SailTime", t); }

    // ------------------------------------------------------------------------------------------------ camera
    void CameraRig(float dt)
    {
        var f = Fwd();
        float aspect = cam.aspect;
        bool tall = aspect < 1f;
        camYaw = Mathf.SmoothDampAngle(camYaw, heading + yawRate * 0.42f, ref camYawV, 0.85f, 400f, dt);
        var cf = Quaternion.Euler(0, camYaw, 0) * Vector3.forward;
        float dist = (tall ? 42f : 35f) + speed * 0.24f;
        float height = (tall ? 19f : 13.5f) + speed * 0.1f;
        var want = pos - cf * dist + Vector3.up * height;
        var look = pos + cf * (tall ? 38f : 34f) + Vector3.up * (tall ? 6f : 9.5f);
        camPos = Vector3.SmoothDamp(camPos == Vector3.zero ? want : camPos, want, ref camPosV, 0.28f, 200f, dt);
        camLook = Vector3.SmoothDamp(camLook == Vector3.zero ? look : camLook, look, ref camLookV, 0.42f, 200f, dt);
        float fov = Mathf.Lerp(tall ? 62f : 50f, tall ? 68f : 56f, Mathf.Clamp01(speed / MaxSpeed));
        shotW = Mathf.MoveTowards(shotW, shotTarget, dt / Mathf.Max(shotBlend, 0.1f));
        float k = shotW * shotW * (3 - 2 * shotW);
        var P = Vector3.Lerp(camPos, shotPos, k);
        var L = Vector3.Lerp(camLook, shotLook, k);
        // The camera never dips below the water, whatever the shot.
        float floor = SeaHeight(P.x, P.z, Time.time) + 2.2f;
        if (P.y < floor) P.y = floor;
        float rollCam = heel * 0.2f * motion * (1 - k);
        camFov = Mathf.Lerp(fov, shotFov * (tall ? 1.35f : 1f), k);
        shake = Mathf.MoveTowards(shake, 0, dt * 1.4f);
        var sh = motion * shake * new Vector3(Mathf.PerlinNoise(Time.time * 13f, 0) - 0.5f, Mathf.PerlinNoise(0, Time.time * 15f) - 0.5f, 0);
        cam.transform.position = P + sh;
        cam.transform.rotation = Quaternion.LookRotation(L - P, Vector3.up) * Quaternion.Euler(0, 0, rollCam);
        cam.fieldOfView = camFov;
    }

    // ------------------------------------------------------------------------------------------------ the water's reflection
    void Reflection()
    {
        if (!reflCam || !reflCam.enabled) return;
        // Mirror the main camera in the water's rest plane. Whatever lies below that plane is flattened on to it by the
        // shader while this camera draws (_MirrorClip), which needs no clip plane and leaves the projection an ordinary one.
        var R = Matrix4x4.Scale(new Vector3(1, -1, 1));
        reflCam.fieldOfView = cam.fieldOfView;
        reflCam.aspect = cam.aspect;
        reflCam.nearClipPlane = cam.nearClipPlane;
        reflCam.farClipPlane = cam.farClipPlane;
        reflCam.worldToCameraMatrix = cam.worldToCameraMatrix * R;
        var p = cam.transform.position; p.y = -p.y;
        reflCam.transform.position = p;
        reflCam.projectionMatrix = cam.projectionMatrix;
    }

    void OnEnable()
    {
        RenderPipelineManager.beginCameraRendering += BeginCam;
        RenderPipelineManager.endCameraRendering += EndCam;
    }
    void OnDisable()
    {
        RenderPipelineManager.beginCameraRendering -= BeginCam;
        RenderPipelineManager.endCameraRendering -= EndCam;
    }
    void BeginCam(ScriptableRenderContext c, Camera cm)
    {
        if (cm != reflCam) return;
        GL.invertCulling = true;
        Shader.SetGlobalFloat("_MirrorClip", 1);
    }
    void EndCam(ScriptableRenderContext c, Camera cm)
    {
        if (cm != reflCam) return;
        GL.invertCulling = false;
        Shader.SetGlobalFloat("_MirrorClip", 0);
    }

    // ------------------------------------------------------------------------------------------------ sound
    void Play(AudioClip c, float v) { if (c && sfx) sfx.PlayOneShot(c, v); }
    void Music(AudioClip c, float v) { if (c && music) { music.clip = c; music.volume = v; music.Play(); } }

    float nextCreak = 4f;
    void Sound(float dt)
    {
        float s = Mathf.Clamp01(speed / MaxSpeed);
        if (wind)
        {
            wind.volume = Mathf.Lerp(wind.volume, Mathf.Lerp(0.14f, 0.34f, s) * (state == St.Done ? 0.5f : 1f), 1 - Mathf.Exp(-dt));
            wind.pitch = Mathf.Lerp(0.85f, 1.15f, s);
        }
        if (water)
        {
            water.volume = Mathf.Lerp(water.volume, Mathf.Lerp(0.08f, 0.55f, s), 1 - Mathf.Exp(-dt * 1.5f));
            water.pitch = Mathf.Lerp(0.8f, 1.08f, s);
        }
        nextCreak -= dt;
        if (nextCreak <= 0)
        {
            nextCreak = UnityEngine.Random.Range(3.5f, 8f);
            Play(clipCreak, UnityEngine.Random.Range(0.14f, 0.3f));
        }
        // A luffing sail rattles.
        luffRattle -= dt;
        if (luff > 0.5f && luffRattle <= 0 && state != St.Boot) { luffRattle = UnityEngine.Random.Range(1.2f, 2.2f); Play(clipFlap, 0.28f * luff); }
    }
    float luffRattle;

    // ------------------------------------------------------------------------------------------------ telling the page
    float reportClock, fpsClock, fpsCount;
    float qualClock;
    int qualStep;
    void Report(float dt)
    {
        reportClock -= dt;
        fpsCount++;
        fpsClock += Time.unscaledDeltaTime;
        if (fpsClock >= 1f)
        {
            float fps = fpsCount / fpsClock;
            fpsClock = 0; fpsCount = 0;
            Send("fps", fps.ToString("0.0", CultureInfo.InvariantCulture));
            // If this machine can't keep up, trade resolution for frame rate. It never goes back up within a voyage.
            qualClock = fps < 40f && Time.timeSinceLevelLoad > 12f ? qualClock + 1f : 0;
            if (qualClock >= 5f && qualStep < 3) { qualClock = 0; qualStep++; ApplyQuality(); }
        }
        if (reportClock <= 0)
        {
            reportClock = 0.12f;
            int n = nextIsland;
            // Position for the chart in the corner, and how far she is off-screen for the arrow that points to her.
            var vp = cam.WorldToViewportPoint(birdPos);
            Send("pos", F(pos.x) + "," + F(pos.z) + "," + F(heading) + "," + (state == St.Sail ? n : -1) + "," + F(vp.x) + "," + F(vp.y) + "," + F(vp.z) + "," + F(speed) + "," + F(rudderPos));
        }
    }

    void ApplyQuality()
    {
        var a = GraphicsSettings.currentRenderPipeline as UniversalRenderPipelineAsset;
        if (a != null)
        {
            a.renderScale = qualStep == 1 ? 0.85f : qualStep == 2 ? 0.7f : 0.6f;
            if (qualStep >= 2) a.msaaSampleCount = 1;
        }
        if (qualStep >= 3 && reflCam) { reflCam.enabled = false; Shader.SetGlobalFloat("_ReflOn", 0); }
        Send("quality", qualStep.ToString());
    }

    // ------------------------------------------------------------------------------------------------ called by the page
    public void AudioOn(string on) { AudioListener.volume = on == "1" ? 1 : 0; }
    public void ReduceMotion(string _) { motion = 0; }
    public void Steer(string v) { hostSteer = float.Parse(v, CultureInfo.InvariantCulture); }
    public void Auto(string on)
    {
        auto = on != "0";
        firstIsland = on == "beautiful" ? 0 : on == "research" ? 1 : on == "play" ? 2 : -1;
    }
    int firstIsland = -1;
    public void Tap(string _)
    {
        // Space or a tap makes a fish jump, from the play island on.
        if (visited[2] && (state == St.Moment || state == St.Sail || state == St.Done || state == St.Finale)) LaunchFish(UnityEngine.Random.value * 6f);
    }
    public void Again(string _)
    {
        StopAllCoroutines();
        ResetWorld();
        pos = Vector3.zero; heading = StartHeading; speed = 0; yawRate = 0; heel = 0; heelVel = 0;
        camYaw = heading; camPos = Vector3.zero; camLook = Vector3.zero;
        finaleFlyHome = false; finaleLanded = false;
        wakeCount = 0;
        perched = true;
        if (lanterns) { lanterns.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear); }
        if (petals) { petals.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear); }
        if (sparks) sparks.Clear();
        canJump = false;
        StartCoroutine(Intro());
    }

    // Stills for the build tool: put the boat somewhere and pose everything without running the game.
    public void Pose(Vector3 p, float head, float spd, float swingAngle, float fillAmt, float t, float duskAmt, float bloomAmt, float heelAmt)
    {
        pos = p; heading = head; speed = spd; swing = swingAngle; fill = fillAmt; heel = heelAmt; dusk = duskAmt; bloom = bloomAmt;
        windSide = swingAngle > 0 ? -1 : 1;
        ApplyPalette(duskAmt);
        Shader.SetGlobalFloat("_SailTime", t);
        var f = Fwd();
        boat.position = new Vector3(p.x, SeaHeight(p.x, p.z, t), p.z);
        boat.rotation = Quaternion.Euler(0, head, 0) * Quaternion.Euler(-spd * 0.09f, 0, -heelAmt);
        yardPivot.localRotation = Quaternion.Euler(0, swingAngle, 0);
        sailMat.SetFloat("_Fill", -windSide * Mathf.Lerp(0.04f, 1f, fillAmt));
        sailMat.SetFloat("_Luff", 0.03f);
        pennantMat.SetFloat("_Luff", 1f);
        blossomMat.SetFloat("_Open", bloomAmt);
        flowersMat.SetFloat("_Open", bloomAmt);
        lampMat.SetFloat("_Emit", 2.5f);
        if (boatLampMat) boatLampMat.SetFloat("_Emit", 0.8f + duskAmt * 7f);
        sea.position = new Vector3(cam.transform.position.x, 0, cam.transform.position.z);
        if (sheet)
        {
            Vector3 a = clew.position, b = sheetFoot.position;
            sheet.position = (a + b) * 0.5f;
            var d = b - a;
            sheet.rotation = Quaternion.FromToRotation(Vector3.up, d.normalized);
            sheet.localScale = new Vector3(0.11f, d.magnitude * 0.5f, 0.11f);
        }
        if (wheel)
        {
            for (int i = 0; i < gondolas.Length; i++)
            {
                float a = (i / (float)gondolas.Length) * 360f;
                gondolas[i].position = wheelPos + new Vector3(Mathf.Cos(a * Mathf.Deg2Rad) * 18.5f, Mathf.Sin(a * Mathf.Deg2Rad) * 18.5f, 0);
            }
        }
        for (int i = 0; i < kites.Length; i++)
        {
            kites[i].position = kiteHome(i);
            var a = kiteAnchors[i]; var b = kites[i].position;
            kiteStrings[i].position = (a + b) * 0.5f;
            kiteStrings[i].rotation = Quaternion.FromToRotation(Vector3.up, (b - a).normalized);
            kiteStrings[i].localScale = new Vector3(0.14f, (b - a).magnitude * 0.5f, 0.14f);
        }
    }

    public void MirrorForStills()
    {
        Reflection();
    }

    public void PerchForStills()
    {
        bird.position = mastTop.position + Vector3.up * 0.55f;
        bird.rotation = Quaternion.Euler(0, heading + 12f, 0);
        wingL.localRotation = Base * Quaternion.Euler(0, -84, 14);
        wingR.localRotation = Base * Quaternion.Euler(0, 84, -14);
        wingL.localScale = wingR.localScale = Vector3.one * 0.62f;
        birdTail.localRotation = Base * Quaternion.Euler(14, 0, 0);
        birdCrest.localRotation = Base;
    }
}
