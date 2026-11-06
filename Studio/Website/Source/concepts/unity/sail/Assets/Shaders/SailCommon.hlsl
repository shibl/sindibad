// What every surface in the game shares: the sky's colours, the haze, the waves and the sun. SailGame sets these each frame, so
// the time of day, the moments on the islands and the sea all stay in step on the boat, the water and the world at once.
#ifndef SAIL_COMMON
#define SAIL_COMMON

float3 _SunDir;      // towards the sun
float3 _SunCol;      // the sun's light, in HDR
float3 _Zen, _Mid, _HorSun, _HorAnti;
float3 _AmbUp, _AmbDown;
float _FogK;
float _Glory;        // the beautiful island's moment: the light opening up
float _Dusk;         // 0 is golden hour, 1 the last of the sunset
float _SailTime;
float4 _WaveA[6];    // direction x, z, amplitude, wavenumber
float4 _WaveB[6];    // angular speed, steepness, phase

TEXTURE2D(_CloudTex); SAMPLER(sampler_CloudTex);

float3 Linear(float3 c) { return c * (c * (c * 0.305306011 + 0.682171111) + 0.012522878); }

// The clear sky along a direction, without its clouds.
float3 SkyGradient(float3 d)
{
    float y = max(d.y, 0.0);
    float3 flat_ = normalize(float3(d.x, 0.0001, d.z));
    float3 sunFlat = normalize(float3(_SunDir.x, 0.0001, _SunDir.z));
    float s = dot(flat_, sunFlat) * 0.5 + 0.5;
    s = s * s * (3.0 - 2.0 * s);
    float3 hor = lerp(_HorAnti, _HorSun, s);
    float3 c = lerp(hor, _Mid, smoothstep(0.0, 0.2, y));
    c = lerp(c, _Zen, smoothstep(0.1, 0.75, y));
    // The glow around the sun: a broad warm wash, then tighter and hotter towards the disc.
    float a = saturate(dot(normalize(d), _SunDir));
    float a4 = a * a; a4 *= a4;
    float a16 = a4 * a4; a16 *= a16;
    float a64 = a16 * a16; a64 *= a64;
    float a256 = a64 * a64; a256 *= a256;
    float a1024 = a256 * a256; a1024 *= a1024;
    c += _SunCol * (0.012 * a16 + 0.05 * a64 + 0.09 * a256 + 0.12 * a1024);
    return c;
}

// Where a direction falls on the cloud panorama: U around the sky, V up it, packed tighter towards the horizon.
float2 CloudUV(float3 d, float drift)
{
    float az = atan2(d.x, d.z) / 6.2831853;
    float el = asin(clamp(d.y, 0.0, 1.0)) / 1.5707963;
    return float2(az + drift, sqrt(el));
}

// Cumulus and cirrus over a clear sky colour. `lod` softens them for the reflections in the water.
float3 AddClouds(float3 sky, float3 d, float lod, out float cover)
{
    float2 uv = CloudUV(d, _SailTime * 0.00012);
    float4 t = SAMPLE_TEXTURE2D_LOD(_CloudTex, sampler_CloudTex, uv, lod);
    float az = saturate(dot(normalize(float3(d.x, 0.0001, d.z)), normalize(float3(_SunDir.x, 0.0001, _SunDir.z))) * 0.5 + 0.5);
    float toward = az * az;
    float3 hue = _SunCol / max(_SunCol.r, 0.01);
    float bright = 0.46 + 0.2 * _SunCol.r;
    // Lit cloud: peach-pink opposite the sun and hot gold towards it. Shade: the sky's blue, warmed a little by the horizon.
    float3 lit = lerp(_HorAnti * 1.02 + hue * 0.12, hue * bright, toward * 0.6 + 0.4 * saturate(toward * 2.0 - 0.6));
    float3 shade = lerp(_Mid * 0.5 + _HorAnti * 0.2, _Mid * 0.4 + _HorSun * 0.24, toward);
    // Red is a soft ramp with 0.5 on the cloud's edge. The edge stays a pixel or two wide however far the texture is enlarged.
    float w = max(fwidth(t.r) * 0.8, 0.05 + lod * 0.05);
    float a = smoothstep(0.5 - w, 0.5 + w, t.r);
    float3 c = lerp(shade, lit, t.g);
    float3 r = lerp(sky, c, a);
    // Cirrus catches the same light but only ever thinly.
    float3 cir = lerp(_HorAnti * 1.1, hue * bright * 0.9, toward);
    r = lerp(r, cir, t.b * 0.42 * (1.0 - a));
    cover = a;
    return r;
}

// Haze: everything far away sinks into the colour of the sky behind it.
float3 Haze(float3 col, float3 wpos, float3 camPos)
{
    float3 v = wpos - camPos;
    float dist = length(v);
    float3 d = v / max(dist, 0.001);
    float k = 1.0 - exp(-dist * _FogK);
    d.y = max(abs(d.y) * 0.25, 0.004);
    return lerp(col, SkyGradient(normalize(d)), k);
}

// Gerstner waves: the same sum the game runs on the CPU to float the boat.
void SeaWaves(float2 xz, float fade, out float3 disp, out float3 normal, out float crest)
{
    disp = 0; float nx = 0, nz = 0, ny = 1; crest = 0;
    for (int i = 0; i < 6; i++)
    {
        float4 A = _WaveA[i]; float4 B = _WaveB[i];
        float ph = A.w * dot(A.xy, xz) - B.x * _SailTime + B.z;
        float s = sin(ph), c = cos(ph);
        float am = A.z * fade;
        disp.xz += B.y * am * A.xy * c;
        disp.y += am * s;
        nx -= A.x * A.w * am * c;
        nz -= A.y * A.w * am * c;
        ny -= B.y * A.w * am * s;
        crest += s * am;
    }
    normal = normalize(float3(nx, max(ny, 0.1), nz));
}

// A hash for sparkle and small variations.
float Hash21(float2 p)
{
    p = frac(p * float2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return frac(p.x * p.y);
}
#endif
