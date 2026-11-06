using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.Runtime.InteropServices;
using UnityEngine;

// The whole game: the coin, the camera moves and the claw. World axes are X right, Y up and Z going away from the player,
// with the machine standing on the floor at the origin and its front facing -Z. All text and buttons live in the host page,
// which hears about everything through Send() and talks back with SendMessage on the public methods at the bottom.
public class ClawGame : MonoBehaviour
{
    public const float BH = 0.86f, GH = 1.0f, TOP = 1.86f, RailY = 1.785f;
    public const float HomeX = -0.3075f, HomeZ = -0.2675f, TravelX = 0.32f, TravelZ = 0.285f;
    public const float RestY = 1.53f, TipReach = 0.27f, FloorY = 0.96f;
    public const float OpenAngle = 25f;
    public const int PrizeLayer = 8;

    public Camera cam;
    public Transform coin, coinHalo, slotPoint;
    public Rigidbody hub;
    public Rigidbody[] prongs = new Rigidbody[3];
    public Transform bridge, carriage, cable, coil, stick, knob, button;
    public Prize[] prizes;
    public Material bulbA, bulbB, bulbC, slotLight, buttonLed, signText, signMat, star, ledMat;
    public Light pitLightA, pitLightB;
    public UnityEngine.Rendering.Universal.ScriptableRendererData rendererData;
    public ParticleSystem confetti;
    public AudioSource sfx, motor, winch, room;
    public AudioClip clipPick, clipIn, clipClick, clipClamp, clipRelease, clipThud, clipWin, clipLose, clipTick, clipStart;

    public enum St { Attract, Coin, Dragging, Inserting, FlyIn, Play, Grab, FlyOut, Result }
    public St state = St.Attract;

    // Claw state, advanced at the physics rate.
    Vector2 gantry = new Vector2(HomeX, HomeZ), vel, lastVel, sway, swayVel;
    float hubY = RestY, angle = OpenAngle, angleTarget = OpenAngle, angleRate = 44f;
    bool autoHome;
    float moveSpeed = 0.40f;
    Vector2 heldInput, keyInput;
    float winchDir;

    float timeLeft;
    int lastSent = -1;
    int roundIndex;
    Prize won;

    // Camera.
    Vector3 camP, camL; float camF;
    Func<Shot> shotFn;
    Shot from; float flyT = 1, flyDur = 1; Vector3 flyMid; bool flyHasMid;
    struct Shot { public Vector3 p, l; public float f; }

    // Coin.
    Vector3 coinHome; float coinDist; Vector3 slotPos;
    float coinPickT; bool coinVisible;

    [DllImport("__Internal")] static extern void ClawSend(string name, string value);
    public static void Send(string name, string value = "")
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        ClawSend(name, value);
#endif
    }

    static string F(float v) => v.ToString("0.###", CultureInfo.InvariantCulture);

    void Awake()
    {
        Application.targetFrameRate = -1;
        QualitySettings.vSyncCount = 1;
        Time.fixedDeltaTime = 1f / 60f;
        // On a slow machine, let the game run slower rather than pile up physics steps it can't afford.
        Time.maximumDeltaTime = 0.1f;
        slotPos = slotPoint.position;
        if (Application.isMobilePlatform) MobileQuality();
        foreach (var p in prizes) p.body.Sleep();
    }

    void MobileQuality()
    {
        var a = UnityEngine.Rendering.GraphicsSettings.currentRenderPipeline as UnityEngine.Rendering.Universal.UniversalRenderPipelineAsset;
        if (a != null) { a.shadowDistance = 4; a.renderScale = 0.85f; a.msaaSampleCount = 2; }
        if (pitLightB) pitLightB.enabled = false;
        // Screen-space occlusion is the priciest thing on the screen, and phones are small enough to spare it.
        if (rendererData != null)
            foreach (var f in rendererData.rendererFeatures)
                if (f != null && f.name == "SSAO") f.SetActive(false);
    }

    void Start()
    {
        ApplyClaw(0);
        var over = Overview();
        camP = over.p; camL = over.l; camF = over.f;
        shotFn = Overview;
        if (room) { room.loop = true; room.volume = 0.32f; room.Play(); }
        if (motor) { motor.loop = true; motor.volume = 0; motor.Play(); }
        if (winch) { winch.loop = true; winch.volume = 0; winch.Play(); }
        coin.gameObject.SetActive(false);
        coinHalo.gameObject.SetActive(false);
        StartCoroutine(Boot());
    }

    IEnumerator Boot()
    {
        Send("ready");
        yield return new WaitForSeconds(0.9f);
        ToCoin(2.0f);
    }

    // ------------------------------------------------------------------------------------------------ camera shots
    Shot Overview()
    {
        float t = Time.time * 0.11f * motion;
        // In a tall window the lens widens until the whole machine fits across.
        float f = 31;
        if (cam.aspect < 0.8f) f = 2 * Mathf.Rad2Deg * Mathf.Atan(Mathf.Tan(f * 0.5f * Mathf.Deg2Rad) * 0.8f / cam.aspect);
        return new Shot { p = new Vector3(1.75f + Mathf.Sin(t) * 0.12f, 1.42f + Mathf.Sin(t * 1.3f) * 0.03f, -4.5f), l = new Vector3(0.02f, 1.2f, 0), f = f };
    }

    public Vector3 coinShotP = new Vector3(0.70f, 0.90f, -1.72f), coinShotL = new Vector3(0.10f, 0.74f, -0.45f);
    Shot CoinShot()
    {
        float t = Time.time * 0.25f * motion;
        var drift = new Vector3(Mathf.Sin(t) * 0.012f, Mathf.Sin(t * 1.4f) * 0.008f, 0);
        // A tall window can't fit the whole front of the machine, so it comes in close on the coin slot alone.
        if (cam.aspect < 1.1f) return new Shot { p = new Vector3(0.42f, 0.74f, -1.32f) + drift, l = new Vector3(0.27f, 0.62f, -0.49f), f = 56 };
        return new Shot { p = coinShotP + drift, l = coinShotL, f = 36 };
    }

    Shot Inside()
    {
        // Up under the lights, just behind the front glass. The camera drifts the opposite way to the claw, which keeps
        // the two a comfortable distance apart anywhere in the box, and it leans towards the claw to keep it in the picture.
        // A tall window has little width to spare, so there the camera turns right round to keep the claw in the middle.
        bool tall = cam.aspect < 1.1f;
        var p = new Vector3(-gantry.x * (tall ? 0.2f : 0.42f), 1.725f, -0.425f);
        var l = new Vector3(gantry.x * (tall ? 1.05f : 0.72f), Mathf.Lerp(1.04f, hubY - 0.2f, 0.42f), gantry.y * 0.78f + 0.08f);
        return new Shot { p = p, l = l, f = cam.aspect < 1.1f ? 84 : 60 };
    }

    Shot DoorShot()
    {
        // The door sits to the left of the frame, leaving room for the winner's card on the right.
        bool tall = cam.aspect < 1.1f;
        return tall ? new Shot { p = new Vector3(-0.24f, 0.46f, -1.5f), l = new Vector3(-0.29f, 0.30f, -0.45f), f = 54 }
                    : new Shot { p = new Vector3(0.36f, 0.84f, -1.95f), l = new Vector3(0.24f, 0.62f, -0.45f), f = 34 };
    }

    void FlyTo(Func<Shot> to, float dur, Vector3? mid = null)
    {
        from = new Shot { p = camP, l = camL, f = camF };
        shotFn = to;
        flyT = 0; flyDur = motion < 1 ? Mathf.Min(dur, 0.5f) : dur;
        flyHasMid = mid.HasValue;
        if (mid.HasValue) flyMid = mid.Value;
    }

    void LateUpdate()
    {
        var s = shotFn();
        if (flyT < 1)
        {
            flyT = Mathf.Min(1, flyT + Time.deltaTime / flyDur);
            float k = flyT * flyT * flyT * (flyT * (flyT * 6 - 15) + 10);
            Vector3 p = flyHasMid ? Bez(from.p, flyMid, s.p, k) : Vector3.Lerp(from.p, s.p, k);
            camP = p;
            camL = Vector3.Lerp(from.l, s.l, k);
            camF = Mathf.Lerp(from.f, s.f, k);
        }
        else
        {
            float d = 1 - Mathf.Exp(-Time.deltaTime * 5f);
            camP = Vector3.Lerp(camP, s.p, d);
            camL = Vector3.Lerp(camL, s.l, d);
            camF = Mathf.Lerp(camF, s.f, d);
        }
        cam.transform.position = camP;
        cam.transform.rotation = Quaternion.LookRotation(camL - camP, Vector3.up);
        cam.fieldOfView = camF;
        DrawRig();
        DrawLights();
    }

    static Vector3 Bez(Vector3 a, Vector3 b, Vector3 c, float t)
    {
        float u = 1 - t;
        return u * u * a + 2 * u * t * b + t * t * c;
    }

    // ------------------------------------------------------------------------------------------------ lights and bulbs
    float motion = 1;
    float chase;
    float winFlash;
    void DrawLights()
    {
        float rate = state == St.Attract || state == St.Coin || state == St.Dragging ? 7f : state == St.Result && won != null ? 18f : 4.5f;
        chase += Time.deltaTime * rate;
        int ph = Mathf.FloorToInt(chase) % 3;
        float sm = chase - Mathf.Floor(chase);
        SetBulb(bulbA, ph == 0, sm); SetBulb(bulbB, ph == 1, sm); SetBulb(bulbC, ph == 2, sm);

        bool wantCoin = state == St.Coin || state == St.Dragging;
        float pulse = 0.5f + 0.5f * Mathf.Sin(Time.time * (wantCoin ? 6f : 1.4f));
        slotLight.SetColor("_EmissionColor", new Color(1f, 0.46f, 0.08f) * (wantCoin ? Mathf.Lerp(1.2f, 7.5f, pulse) : 0.7f));
        bool wantDrop = state == St.Play;
        buttonLed.SetColor("_EmissionColor", new Color(1f, 0.82f, 0.3f) * (wantDrop ? Mathf.Lerp(1.5f, 6f, pulse) : 0.8f));

        winFlash = Mathf.MoveTowards(winFlash, 0, Time.deltaTime * 0.7f);
        float signPulse = 1 + 0.06f * Mathf.Sin(Time.time * 2.1f) + winFlash * 2.2f * Mathf.Abs(Mathf.Sin(Time.time * 15f));
        signText.SetColor("_EmissionColor", new Color(1f, 0.96f, 0.9f) * 3.2f * signPulse);
        signMat.SetColor("_EmissionColor", Color.white * 1.15f * signPulse);
        star.SetColor("_EmissionColor", new Color(1f, 0.74f, 0.2f) * 2.4f * signPulse);
        ledMat.SetColor("_EmissionColor", new Color(1f, 0.97f, 0.92f) * 5.5f * (1 + winFlash * 1.2f * Mathf.Abs(Mathf.Sin(Time.time * 15f))));
    }

    void SetBulb(Material m, bool lit, float sm)
    {
        float v = lit ? Mathf.Lerp(3f, 8f, 1 - sm) : 0.28f;
        m.SetColor("_EmissionColor", new Color(1f, 0.82f, 0.5f) * v);
    }

    // ------------------------------------------------------------------------------------------------ the coin
    void ToCoin(float dur)
    {
        state = St.Coin;
        FlyTo(CoinShot, dur);
        StartCoroutine(ShowCoin(dur * 0.55f));
    }

    IEnumerator ShowCoin(float wait)
    {
        Send("state", "fly-coin");
        yield return new WaitForSeconds(wait);
        coin.gameObject.SetActive(true);
        coinHalo.gameObject.SetActive(true);
        coinVisible = true;
        coinPickT = 0;
        coinPos = Vector3.zero; coinPosValid = false;
        Send("state", "coin");
        reportCoinT = 0;
    }

    // The coin rests low and to the left, close to the camera, so it's big and obviously something to pick up.
    Vector3 CoinRest()
    {
        var ray = cam.ViewportPointToRay(new Vector3(0.26f, 0.30f, 0));
        return ray.GetPoint(0.46f);
    }

    Vector3 coinPos; bool coinPosValid;
    float reportCoinT;
    float coinSpin;

    void UpdateCoin()
    {
        if (!coinVisible) return;
        var rest = CoinRest();
        Vector3 pointer = Input.mousePosition;
        var slotScreen = cam.WorldToScreenPoint(slotPos);
        float scale = Screen.height / 900f;

        if (state == St.Coin)
        {
            coinPickT = Mathf.Min(1, coinPickT + Time.deltaTime * 2.6f);
            float pop = Mathf.Sin(coinPickT * Mathf.PI * 0.5f);
            if (!coinPosValid) { coinPos = rest + cam.transform.up * -0.3f; coinPosValid = true; }
            coinPos = Vector3.Lerp(coinPos, rest + cam.transform.up * Mathf.Sin(Time.time * 1.8f) * 0.006f, 1 - Mathf.Exp(-Time.deltaTime * 8));
            coin.position = coinPos;
            coinSpin += Time.deltaTime * 70f;
            // The coin's face points at the camera (its axis is the local Y of the mesh, after import), turning slowly.
            coin.rotation = Quaternion.LookRotation(cam.transform.position - coinPos, Vector3.up) * Quaternion.Euler(0, Mathf.Sin(coinSpin * Mathf.Deg2Rad) * 32f, 0);
            var cs = cam.WorldToScreenPoint(coinPos);
            if (Input.GetMouseButtonDown(0) && (new Vector2(cs.x, cs.y) - new Vector2(pointer.x, pointer.y)).magnitude < 130f * scale)
            {
                state = St.Dragging;
                Play(clipPick, 0.8f);
                Send("state", "dragging");
            }
            coinHalo.position = coinPos - cam.transform.forward * -0.01f;
            coinHalo.rotation = cam.transform.rotation;
            float h = 0.13f + 0.03f * Mathf.Sin(Time.time * 4.2f);
            coinHalo.localScale = Vector3.one * h * pop;
            coinHalo.gameObject.SetActive(true);
        }
        else if (state == St.Dragging)
        {
            float toSlot = (new Vector2(pointer.x, pointer.y) - new Vector2(slotScreen.x, slotScreen.y)).magnitude;
            float near = Mathf.InverseLerp(Screen.height * 0.5f, Screen.height * 0.05f, toSlot);
            float slotDepth = (slotPos - cam.transform.position).magnitude;
            float depth = Mathf.Lerp(0.46f, slotDepth - 0.04f, Mathf.SmoothStep(0, 1, near));
            var ray = cam.ScreenPointToRay(pointer);
            var want = ray.GetPoint(depth);
            coinPos = Vector3.Lerp(coinPos, want, 1 - Mathf.Exp(-Time.deltaTime * 22));
            coin.position = coinPos;
            var edgeOn = Quaternion.LookRotation(Vector3.right, Vector3.up);
            var faceOn = Quaternion.LookRotation(cam.transform.position - coinPos, Vector3.up);
            coin.rotation = Quaternion.Slerp(faceOn, edgeOn, Mathf.SmoothStep(0, 1, near * near));
            coinHalo.gameObject.SetActive(false);
            if (toSlot < 44f * scale)
            {
                StartCoroutine(InsertCoin());
            }
            else if (Input.GetMouseButtonUp(0))
            {
                if (toSlot < 120f * scale) StartCoroutine(InsertCoin());
                else
                {
                    state = St.Coin;
                    Send("state", "coin");
                    Play(clipClick, 0.25f);
                }
            }
        }

        reportCoinT -= Time.deltaTime;
        if (reportCoinT <= 0 && (state == St.Coin))
        {
            reportCoinT = 0.2f;
            var cs = cam.WorldToViewportPoint(coin.position);
            var ss = cam.WorldToViewportPoint(slotPos);
            Send("coin", F(cs.x) + "," + F(cs.y) + "," + F(ss.x) + "," + F(ss.y));
        }
    }

    IEnumerator InsertCoin()
    {
        state = St.Inserting;
        Send("state", "insert");
        var start = coin.position;
        var startRot = coin.rotation;
        var front = slotPos + new Vector3(0, 0, -0.045f);
        var edgeOn = Quaternion.LookRotation(Vector3.right, Vector3.up);
        float t = 0;
        while (t < 1)
        {
            t = Mathf.Min(1, t + Time.deltaTime / 0.22f);
            float k = Mathf.SmoothStep(0, 1, t);
            coin.position = Vector3.Lerp(start, front, k);
            coin.rotation = Quaternion.Slerp(startRot, edgeOn, k);
            yield return null;
        }
        Play(clipIn, 1f);
        var inside = slotPos + new Vector3(0, 0, 0.095f);
        t = 0;
        while (t < 1)
        {
            t = Mathf.Min(1, t + Time.deltaTime / 0.28f);
            coin.position = Vector3.Lerp(front, inside, t * t);
            yield return null;
        }
        coin.gameObject.SetActive(false);
        coinHalo.gameObject.SetActive(false);
        coinVisible = false;
        yield return new WaitForSeconds(0.55f);
        BeginFlyIn();
    }

    void BeginFlyIn()
    {
        state = St.FlyIn;
        Send("state", "fly-in");
        // Up and over the deck, then straight through the front glass.
        FlyTo(Inside, 2.5f, new Vector3(0.12f, 1.62f, -1.42f));
        StartCoroutine(BeginPlay(2.45f));
    }

    IEnumerator BeginPlay(float wait)
    {
        yield return new WaitForSeconds(wait);
        state = St.Play;
        timeLeft = 30f;
        lastSent = -1;
        roundIndex++;
        Play(clipStart, 0.7f);
        Send("state", "play");
    }

    // ------------------------------------------------------------------------------------------------ the round
    void Update()
    {
        UpdateCoin();
        keyInput = Vector2.zero;
        if (state == St.Play)
        {
            if (Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A)) keyInput.x -= 1;
            if (Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D)) keyInput.x += 1;
            if (Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.W)) keyInput.y += 1;
            if (Input.GetKey(KeyCode.DownArrow) || Input.GetKey(KeyCode.S)) keyInput.y -= 1;
            timeLeft -= Time.deltaTime;
            int sec = Mathf.CeilToInt(timeLeft);
            if (sec != lastSent)
            {
                lastSent = sec;
                Send("time", sec.ToString());
                if (sec <= 5 && sec > 0) Play(clipTick, 0.55f);
            }
            if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return) || timeLeft <= 0) StartCoroutine(Grab());
        }
        float mv = Mathf.Clamp01(vel.magnitude / moveSpeed);
        if (motor) { motor.volume = Mathf.MoveTowards(motor.volume, mv * 0.32f, Time.deltaTime * 2); motor.pitch = 0.82f + mv * 0.28f; }
        if (winch) { winch.volume = Mathf.MoveTowards(winch.volume, Mathf.Abs(winchDir) * 0.42f, Time.deltaTime * 3); winch.pitch = winchDir > 0 ? 1.12f : 0.92f; }
    }

    void Play(AudioClip c, float v) { if (c && sfx) sfx.PlayOneShot(c, v); }

    Vector3 CageCentre() => hub.position + Vector3.down * 0.17f;

    IEnumerator Grab()
    {
        state = St.Grab;
        heldInput = Vector2.zero;
        Send("state", "drop");
        Play(clipClick, 0.8f);
        // The aim is judged now, as the player lets go, before the prongs have shoved anything around.
        float aimError = AimError();

        // Down, until the head bumps something or the tips reach the bed of the pile.
        float min = FloorY + TipReach - 0.02f;
        float speed = 0;
        winchDir = -1;
        while (true)
        {
            speed = Mathf.MoveTowards(speed, 0.44f, Time.fixedDeltaTime * 1.6f);
            hubY -= speed * Time.fixedDeltaTime;
            if (hubY <= min) { hubY = min; break; }
            if (Physics.CheckSphere(hub.position + Vector3.down * 0.075f, 0.040f, 1 << PrizeLayer)) break;
            yield return new WaitForFixedUpdate();
        }
        winchDir = 0;
        Send("state", "close");
        yield return new WaitForSeconds(0.18f);
        // Shut. Like a real machine this one's grip isn't always enough: how well the claw was centred on the prize sets the
        // odds, and a grab that loses them weakens partway home, so the prize really does slide out of the prongs.
        Prize caught = NearestUnderClaw();
        if (caught != null)
        {
            var off = caught.body.worldCenterOfMass - CageCentre();
            held = new Vector2(off.x, off.z).magnitude < 0.095f ? caught : null;
        }
        bool willSlip = UnityEngine.Random.value > HoldChance(aimError);
        // A slip has to start well short of the chute, or the falling prize would land in it anyway. A prize grabbed close to
        // the chute can only slip on the way up; one from further off usually goes on the trip home.
        float way0 = (gantry - new Vector2(HomeX, HomeZ)).magnitude;
        bool slipOnLift = way0 < SlipClear || UnityEngine.Random.value < 0.25f;
        float slipLift = UnityEngine.Random.Range(0.35f, 0.95f);
        float slipDist = UnityEngine.Random.Range(SlipClear, Mathf.Max(SlipClear, way0));
        bool slipping = false;
#if CLAW_TEST
        Send("aim", F(aimError) + "," + (caught ? caught.id : "none") + "," + (willSlip ? 1 : 0));
#endif
        float firm = UnityEngine.Random.Range(0f, 2.5f);
        angleTarget = 0.5f;
        angleRate = 30f;
        Play(clipClamp, 0.9f);
        while (Mathf.Abs(angle - angleTarget) > 0.1f) yield return new WaitForFixedUpdate();
        yield return new WaitForSeconds(0.28f);

        void Weaken()
        {
            slipping = true;
            angleTarget = SlipAngle;
            angleRate = 24f;
            if (held != null && Caged(held)) { Send("state", "slip"); Play(clipRelease, 0.45f); }
            held = null;
        }

        Send("state", "lift");
        winchDir = 1;
        speed = 0;
        while (hubY < RestY)
        {
            speed = Mathf.MoveTowards(speed, 0.30f, Time.fixedDeltaTime * 0.9f);
            hubY = Mathf.Min(RestY, hubY + speed * Time.fixedDeltaTime);
            float lift = Mathf.InverseLerp(min, RestY, hubY);
            if (!slipping)
            {
                angleTarget = Mathf.Lerp(0.5f, firm, lift);
                angleRate = 6f;
                if (willSlip && slipOnLift && lift >= slipLift) Weaken();
            }
            yield return new WaitForFixedUpdate();
        }
        winchDir = 0;
        yield return new WaitForSeconds(0.25f);

        Send("state", "return");
        autoHome = true;
        while ((gantry - new Vector2(HomeX, HomeZ)).magnitude > 0.004f || vel.magnitude > 0.02f)
        {
            if (!slipping)
            {
                if (willSlip && !slipOnLift && (gantry - new Vector2(HomeX, HomeZ)).magnitude <= slipDist) Weaken();
            }
            yield return new WaitForFixedUpdate();
        }
        autoHome = false;
        yield return new WaitForSeconds(0.45f);

        // Let go.
#if CLAW_TEST
        Prize carried = null;
        foreach (var p in prizes) if (p && p.gameObject.activeSelf && Caged(p)) carried = p;
        Send("carry", (carried ? carried.id : "none") + "," + (willSlip ? 1 : 0) + "," + (slipping ? 1 : 0));
        Prize afterLift = carried;
#endif
        held = null;
        Send("state", "release");
        Play(clipRelease, 0.8f);
        angleTarget = OpenAngle;
        angleRate = 55f;
        float wait = 0;
        Prize got = null;
        while (wait < 2.3f)
        {
            wait += Time.fixedDeltaTime;
            foreach (var p in prizes)
                if (p && p.gameObject.activeSelf && p.transform.position.y < 0.84f && p.transform.position.x < -0.1f && p.transform.position.z < -0.1f) got = p;
            if (got != null && wait > 1.3f) break;
            yield return new WaitForFixedUpdate();
        }
        if (got != null) { Play(clipThud, 0.8f); yield return new WaitForSeconds(0.25f); }

#if CLAW_TEST
        if (afterLift) { var q = afterLift.transform.position; Send("carryend", F(q.x) + "," + F(q.y) + "," + F(q.z)); }
#endif
        won = got;
        state = St.Result;
        if (won != null)
        {
            Play(clipWin, 1f);
            winFlash = 1;
            FlyTo(DoorShot, 2.2f, new Vector3(-0.05f, 1.45f, -1.3f));
            yield return new WaitForSeconds(1.5f);
            if (confetti) { confetti.transform.position = new Vector3(-0.29f, 0.56f, -0.56f); confetti.Play(); }
            Send("win", won.id);
        }
        else
        {
            Play(clipLose, 0.8f);
            Send("lose", "");
            yield return new WaitForSeconds(0.8f);
            FlyTo(CoinShot, 2.3f, new Vector3(0.28f, 1.55f, -1.32f));
            yield return new WaitForSeconds(1.0f);
            state = St.Coin;
            StartCoroutine(ShowCoin(0.8f));
        }
    }

    public const float SlipAngle = 18f, SlipClear = 0.52f;

    // How likely a grab is to hold, from how far off centre the claw came down: firm when well aimed, feeble when sloppy.
    public static float HoldChance(float aimError)
    {
        return Mathf.Lerp(0.74f, 0.26f, Mathf.InverseLerp(0.02f, 0.05f, aimError));
    }

    // How far the claw is from the middle of the nearest prize a player could be aiming at: one with nothing lying on top.
    float AimError()
    {
        float best = 1;
        foreach (var p in prizes)
        {
            if (!Exposed(p)) continue;
            var q = p.body.worldCenterOfMass;
            best = Mathf.Min(best, new Vector2(q.x - gantry.x, q.z - gantry.y).magnitude);
        }
        return best;
    }

    bool Exposed(Prize p)
    {
        if (!p || !p.gameObject.activeSelf) return false;
        var q = p.body.worldCenterOfMass;
        if (q.y < FloorY) return false;
        foreach (var o in prizes)
        {
            if (!o || o == p || !o.gameObject.activeSelf) continue;
            var w = o.body.worldCenterOfMass;
            if (w.y > q.y + 0.02f && new Vector2(w.x - q.x, w.z - q.z).magnitude < 0.11f) return false;
        }
        return true;
    }

    Prize NearestUnderClaw()
    {
        Prize best = null;
        float distance = 1;
        var c = CageCentre();
        foreach (var p in prizes)
        {
            if (!p || !p.gameObject.activeSelf) continue;
            var d = p.body.worldCenterOfMass - c;
            if (Mathf.Abs(d.y) > 0.16f) continue;
            float h = new Vector2(d.x, d.z).magnitude;
            if (h < distance) { distance = h; best = p; }
        }
        return best;
    }

    bool Caged(Prize p)
    {
        var d = p.body.worldCenterOfMass - CageCentre();
        return new Vector2(d.x, d.z).magnitude < 0.09f && Mathf.Abs(d.y) < 0.13f;
    }

    // Three prongs alone squeeze a round prize out through their gaps, and the pile shoves it about as they close. So the one
    // prize the claw came down on is drawn gently to the middle of the cage and carried there, until the grip fails or it's
    // over the chute. The prongs still collide with everything, and once this lets go the prize just falls.
    Prize held;
    Vector3 lastHub, hubVel;
    void Carry(float dt)
    {
        hubVel = (hub.position - lastHub) / dt;
        lastHub = hub.position;
        if (held == null) return;
        var b = held.body;
        var d = CageCentre() - b.worldCenterOfMass;
        if (d.magnitude > 0.16f) { held = null; return; }
        if (b.IsSleeping()) b.WakeUp();
        b.AddForce(d * 100f - (b.linearVelocity - hubVel) * 16f + Vector3.up * 9.81f, ForceMode.Acceleration);
        b.angularVelocity *= 0.94f;
    }

    void FixedUpdate()
    {
        float dt = Time.fixedDeltaTime;
        Carry(dt);
        Vector2 want = Vector2.zero;
        if (autoHome)
        {
            var to = new Vector2(HomeX, HomeZ) - gantry;
            float brake = Mathf.Sqrt(2 * 0.9f * to.magnitude);
            want = to.normalized * Mathf.Min(0.46f, brake);
            if (to.magnitude < 0.002f) want = Vector2.zero;
        }
        else if (state == St.Play)
        {
            var i = keyInput + heldInput;
            want = Vector2.ClampMagnitude(i, 1) * moveSpeed;
        }
        vel = Vector2.MoveTowards(vel, want, 1.3f * dt);
        gantry += vel * dt;
        gantry.x = Mathf.Clamp(gantry.x, -TravelX, TravelX);
        gantry.y = Mathf.Clamp(gantry.y, -TravelZ, TravelZ);

        // The head hangs from its wire like a pendulum, so it swings when the carriage starts and stops.
        var acc = (vel - lastVel) / dt;
        lastVel = vel;
        float len = Mathf.Max(0.14f, RailY - hubY);
        float k = 9.81f / len;
        swayVel += (-k * sway - 1.5f * swayVel - acc * 0.85f) * dt;
        sway += swayVel * dt;
        sway = Vector2.ClampMagnitude(sway, 0.06f);

        angle = Mathf.MoveTowards(angle, angleTarget, angleRate * dt);
        ApplyClaw(dt);
    }

    public void ApplyClaw(float dt)
    {
        var hp = new Vector3(gantry.x + sway.x, hubY, gantry.y + sway.y);
        var tilt = Quaternion.Euler(sway.y * 90f, 0, -sway.x * 90f);
        if (dt > 0)
        {
            hub.MovePosition(hp);
            hub.MoveRotation(tilt);
        }
        else
        {
            hub.transform.SetPositionAndRotation(hp, tilt);
        }
        for (int i = 0; i < 3; i++)
        {
            float az = 90f + 120f * i;
            var yaw = Quaternion.AngleAxis(-az, Vector3.up);
            var rot = tilt * yaw * Quaternion.Euler(0, 0, angle);
            var pos = hp + tilt * (yaw * new Vector3(0.036f, 0, 0));
            if (dt > 0) { prongs[i].MovePosition(pos); prongs[i].MoveRotation(rot); }
            else prongs[i].transform.SetPositionAndRotation(pos, rot);
        }
    }

    public void DrawRig()
    {
        // The bridge and carriage follow the interpolated head, less its swing.
        bridge.position = new Vector3(0, RailY, gantry.y);
        carriage.position = new Vector3(gantry.x, RailY - 0.008f, gantry.y);
        var top = new Vector3(gantry.x, RailY - 0.075f, gantry.y);
        var low = hub.transform.position + hub.transform.up * 0.085f;
        var d = low - top;
        float L = d.magnitude;
        var q = Quaternion.FromToRotation(Vector3.down, d.normalized);
        cable.SetPositionAndRotation(top, q);
        cable.localScale = new Vector3(1, L, 1);
        coil.SetPositionAndRotation(top + new Vector3(0, 0, 0), q);
        coil.localScale = new Vector3(1, L, 1);
        if (stick)
        {
            var i = (state == St.Play ? keyInput + heldInput : Vector2.zero);
            stickTilt = Vector2.Lerp(stickTilt, Vector2.ClampMagnitude(i, 1), 1 - Mathf.Exp(-Time.deltaTime * 14));
            var r = Quaternion.Euler(stickTilt.y * 14f, 0, -stickTilt.x * 14f);
            stick.localRotation = r * stickBase;
            knob.localRotation = r * stickBase;
        }
        if (button) button.localPosition = buttonRest + Vector3.down * (state == St.Grab && hubY < RestY - 0.02f && winchDir < 0 ? 0.008f : 0);
    }
    public Vector3 buttonRest;
    public Quaternion stickBase = Quaternion.Euler(0, 180, 0);
    Vector2 stickTilt;

    // ------------------------------------------------------------------------------------------------ called by the page
    public void Hold(string s)
    {
        // "x,y" from the on-screen pad, each -1, 0 or 1.
        var p = s.Split(',');
        heldInput = new Vector2(float.Parse(p[0], CultureInfo.InvariantCulture), float.Parse(p[1], CultureInfo.InvariantCulture));
    }

    public void Drop(string _)
    {
        if (state == St.Play) StartCoroutine(Grab());
    }

    public void Again(string _)
    {
        if (state != St.Result) return;
        if (won) won.gameObject.SetActive(false);
        won = null;
        state = St.Coin;
        FlyTo(CoinShot, 2.0f);
        StartCoroutine(ShowCoin(1.1f));
    }

    public void ReduceMotion(string _)
    {
        motion = 0;
    }

    public void AudioOn(string on)
    {
        AudioListener.volume = on == "1" ? 1 : 0;
    }

#if CLAW_TEST
    // Only in test builds (CLAW_TEST=1). The shipped game has none of this.
    public void Debug_(string _)
    {
        var tops = new List<Prize>();
        foreach (var p in prizes)
        {
            if (!Exposed(p)) continue;
            var q = p.body.worldCenterOfMass;
            if (Mathf.Abs(q.x) < TravelX - 0.06f && Mathf.Abs(q.z) < TravelZ - 0.06f && !(q.x < -0.02f && q.z < 0.02f) && q.y > 1.07f) tops.Add(p);
        }
        var best = tops.Count > 0 ? tops[UnityEngine.Random.Range(0, tops.Count)] : null;
        var t = best ? best.body.worldCenterOfMass : Vector3.zero;
        Send("debug", F(gantry.x) + "," + F(gantry.y) + "," + F(hubY) + "," + F(angle) + "," + F(t.x) + "," + F(t.y) + "," + F(t.z) + "," + state + "," + (1f / Mathf.Max(Time.smoothDeltaTime, 0.001f)).ToString("0") + "," + (best ? best.id : "none"));
    }

    public void DebugMove(string s)
    {
        var p = s.Split(',');
        gantry = new Vector2(float.Parse(p[0], CultureInfo.InvariantCulture), float.Parse(p[1], CultureInfo.InvariantCulture));
    }

    // Starts a grab straight from the coin state at the given spot, for measuring many rounds quickly.
    public void DebugGrab(string s)
    {
        StopCoroutine(nameof(ShowCoin));
        coinVisible = false;
        coin.gameObject.SetActive(false);
        coinHalo.gameObject.SetActive(false);
        DebugMove(s);
        vel = lastVel = sway = swayVel = Vector2.zero;
        state = St.Play;
        StartCoroutine(Grab());
    }

    public void DebugSpeed(string s)
    {
        Time.timeScale = float.Parse(s, CultureInfo.InvariantCulture);
        Time.maximumDeltaTime = 0.1f * Time.timeScale;
    }
#endif
}
