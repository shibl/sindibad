// The sea: Gerstner waves, sky and island reflections, a colour that follows the depth, foam on crests and shores, a road of
// sun on the water, and the chart the research island draws on it.
Shader "Sindibad/Sea"
{
    Properties
    {
        _N1 ("Ripples", 2D) = "bump" {}
        _N2 ("Fine ripples", 2D) = "bump" {}
        _Foam ("Foam", 2D) = "black" {}
        _Shore ("Depth map", 2D) = "white" {}
    }
    SubShader
    {
        Tags { "Queue" = "Geometry+50" "RenderType" = "Opaque" "RenderPipeline" = "UniversalPipeline" }
        Pass
        {
            Tags { "LightMode" = "UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE
            #pragma multi_compile_fragment _ _SHADOWS_SOFT _SHADOWS_SOFT_LOW _SHADOWS_SOFT_MEDIUM _SHADOWS_SOFT_HIGH
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            #include "SailCommon.hlsl"
            TEXTURE2D(_N1); SAMPLER(sampler_N1);
            TEXTURE2D(_N2); SAMPLER(sampler_N2);
            TEXTURE2D(_Foam); SAMPLER(sampler_Foam);
            TEXTURE2D(_Shore); SAMPLER(sampler_Shore);
            TEXTURE2D(_ReflTex); SAMPLER(sampler_ReflTex);
            CBUFFER_START(UnityPerMaterial)
                float _Pad;
            CBUFFER_END
            float4 _ShoreST;       // world XZ to the depth map
            float3 _Deep, _Teal, _Shallow, _SandTint, _FoamLit, _FoamShade;
            float _Lite;           // phones: fewer samples and no planar reflection
            float _ReflOn;
            float _Chart;          // reveal radius of the chart, in metres
            float _ChartFade;
            float3 _ChartC;        // where the chart spreads from
            float4 _Routes[3];     // x0, z0, x1, z1
            float _RouteFade;
            float _Flash;          // fireworks lighting the water

            struct A { float4 pos : POSITION; };
            struct V
            {
                float4 cs : SV_POSITION;
                float3 wpos : TEXCOORD0;
                float3 nrm : TEXCOORD1;
                float4 sp : TEXCOORD2;
                float crest : TEXCOORD3;
            };

            V vert(A a)
            {
                V o;
                float3 w = TransformObjectToWorld(a.pos.xyz);
                float dist = length(w.xz - _WorldSpaceCameraPos.xz);
                float fade = 1.0 - smoothstep(350.0, 1600.0, dist);
                float3 disp, n; float crest;
                SeaWaves(w.xz, fade, disp, n, crest);
                w += disp;
                o.wpos = w;
                o.nrm = n;
                o.crest = crest;
                o.cs = TransformWorldToHClip(w);
                o.sp = ComputeScreenPos(o.cs);
                return o;
            }

            float Segment(float2 p, float2 a, float2 b, out float along)
            {
                float2 ab = b - a;
                float t = saturate(dot(p - a, ab) / dot(ab, ab));
                along = t * length(ab);
                return length(p - a - ab * t);
            }

            // The chart the research island lays on the water: rings of distance and rays of bearing, an astrolabe the size of the sea,
            // with dashed routes running out to each island still to find. Thin lines stay thin at any distance, so it reads as drawn.
            float3 Chart(float3 P, float dist)
            {
                float3 ink = float3(1.0, 0.78, 0.42);
                float3 c = 0;
                float2 r = P.xz - _ChartC.xz;
                float rd = length(r);
                float px = dist * 0.0011 + 0.1;
                float farFade = 1.0 - smoothstep(1000.0, 1900.0, dist);
                if (_Chart > 0.0)
                {
                    float front = saturate((_Chart - rd) / 80.0);
                    float edge = exp(-abs(_Chart - rd) / 9.0) * step(rd, _Chart + 40.0);
                    float ringD = abs(frac(rd / 110.0 + 0.5) - 0.5) * 110.0;
                    float line_ = smoothstep(px * 1.6 + 0.35, px * 0.3 + 0.05, ringD);
                    float major = abs(frac(rd / 440.0 + 0.5) - 0.5) * 440.0;
                    line_ += smoothstep(px * 2.4 + 0.5, px * 0.5 + 0.1, major) * 0.8;
                    float ang = atan2(r.y, r.x) / 6.2831853;
                    float ray = abs(frac(ang * 32.0 + 0.5) - 0.5) / 32.0 * 6.2831853 * rd;
                    float rays = smoothstep(px * 1.3 + 0.25, px * 0.3, ray) * smoothstep(70.0, 120.0, rd);
                    float tick = abs(frac(ang * 256.0 + 0.5) - 0.5) / 256.0 * 6.2831853 * rd;
                    float ticks = smoothstep(px * 0.9 + 0.12, px * 0.2, tick) * smoothstep(3.0 + px, 1.6 + px, ringD);
                    c += ink * (line_ * 0.62 + rays * 0.2 + ticks * 0.34 * (1.0 - smoothstep(250.0, 700.0, dist))) * front * _ChartFade * farFade;
                    c += ink * edge * 0.75 * _ChartFade;
                }
                if (_RouteFade > 0.0)
                {
                    for (int k = 0; k < 3; k++)
                    {
                        float4 rt = _Routes[k];
                        if (rt.x == rt.z && rt.y == rt.w) continue;
                        float along;
                        float dd = Segment(P.xz, rt.xy, rt.zw, along);
                        // Dashes run along the route, moving towards the island they lead to.
                        float dash = smoothstep(0.3, 0.24, abs(frac(along / 26.0 - _SailTime * 0.16) - 0.5));
                        float w = smoothstep(px * 1.6 + 1.9, px * 0.5 + 1.0, dd);
                        c += ink * w * dash * 1.05 * _RouteFade;
                    }
                }
                return c;
            }

            float4 frag(V i) : SV_Target
            {
                float3 P = i.wpos;
                float3 toCam = _WorldSpaceCameraPos - P;
                float dist = length(toCam);
                float3 Vw = toCam / dist;
                float t = _SailTime;

                // Ripples at three scales, faded out with distance so far water doesn't shimmer as noise.
                float near_ = 1.0 - smoothstep(60.0, 650.0, dist);
                float mid = 1.0 - smoothstep(220.0, 1800.0, dist);
                float2 a = UnpackNormal(SAMPLE_TEXTURE2D(_N1, sampler_N1, P.xz / 61.0 + float2(0.012, 0.016) * t)).xy;
                float2 b = UnpackNormal(SAMPLE_TEXTURE2D(_N1, sampler_N1, P.xz.yx / 23.0 + float2(-0.021, 0.027) * t)).xy;
                float2 nd = a * 0.55 * lerp(0.4, 1.0, mid) + b * 0.42 * lerp(0.12, 1.0, near_);
                float2 c1 = 0;
                if (_Lite < 0.5)
                {
                    c1 = UnpackNormal(SAMPLE_TEXTURE2D(_N2, sampler_N2, P.xz / 7.3 + float2(0.04, -0.05) * t)).xy;
                    nd += c1 * 0.28 * near_;
                }
                float3 macro = normalize(i.nrm);
                float3 N = normalize(float3(macro.x + nd.x * 0.17, macro.y, macro.z + nd.y * 0.17));

                float NoV = saturate(dot(N, Vw));
                float fres = 0.025 + 0.975 * pow(1.0 - NoV, 5.0);
                // Past a point the far sea is nearly all reflection.
                fres = lerp(fres, 0.9, smoothstep(300.0, 2600.0, dist) * 0.8);

                // The sky in the water, softened: only the big ripples break it up, so it stays a sheet of colour rather than noise.
                float3 Nr = normalize(float3(macro.x * 0.8 + a.x * 0.09, macro.y, macro.z * 0.8 + a.y * 0.09));
                float3 R = reflect(-Vw, Nr);
                R.y = abs(R.y) + 0.02;
                R = normalize(R);
                float cover;
                float3 refl = AddClouds(SkyGradient(R), R, 5.0, cover);

                // Islands and the boat in the water. Ripples smear them downwards, as on real water, and hardly at all sideways.
                if (_ReflOn > 0.5)
                {
                    float2 suv = i.sp.xy / i.sp.w;
                    float wob = saturate(90.0 / max(dist, 90.0));
                    suv += float2((nd.x * 0.012 + macro.x * 0.03), (nd.y * 0.03 + macro.z * 0.1)) * lerp(0.35, 1.0, wob);
                    float k = 0.012 * lerp(0.4, 1.0, wob);
                    float4 pr = SAMPLE_TEXTURE2D(_ReflTex, sampler_ReflTex, suv) * 0.34;
                    pr += SAMPLE_TEXTURE2D(_ReflTex, sampler_ReflTex, suv + float2(0.0, k)) * 0.26;
                    pr += SAMPLE_TEXTURE2D(_ReflTex, sampler_ReflTex, suv + float2(0.0, -k)) * 0.22;
                    pr += SAMPLE_TEXTURE2D(_ReflTex, sampler_ReflTex, suv + float2(0.0, k * 2.2)) * 0.18;
                    refl = refl * (1.0 - pr.a) + pr.rgb * 0.92;
                }

                // The body of the water: dark in the deep and luminous over sand.
                float depth = SAMPLE_TEXTURE2D(_Shore, sampler_Shore, P.xz * _ShoreST.xy + _ShoreST.zw).r;
                float deepK = smoothstep(0.29, 0.62, depth);
                float3 body = lerp(_Shallow, _Teal, smoothstep(0.26, 0.4, depth));
                body = lerp(body, _Deep, deepK);
                // Warm sand showing through the last few metres.
                body = lerp(_SandTint, body, smoothstep(0.255, 0.31, depth));

                // Light through the wave backs towards the sun: the green-gold glow in a swell at this hour.
                float3 sc = normalize(_SunDir * float3(1, 0.3, 1));
                float backlit = pow(saturate(dot(-Vw, normalize(sc + N * 0.5))), 3.0);
                float rise = saturate(i.crest * 0.7 + 0.55);
                float3 scatter = _SunCol * float3(0.06, 0.26, 0.2) * backlit * rise * (1.0 - deepK * 0.35);

                float3 amb = lerp(_AmbDown, _AmbUp, 0.72);
                float3 col = body * (amb + _SunCol * 0.2) + scatter;
                col = lerp(col, refl, fres);

                // Shadows of the sail and hull fall on the water's colour.
                float shadow = 1.0;
                #if defined(_MAIN_LIGHT_SHADOWS) || defined(_MAIN_LIGHT_SHADOWS_CASCADE)
                if (dist < 180.0)
                {
                    float4 sc2 = TransformWorldToShadowCoord(P);
                    shadow = lerp(1.0, MainLightRealtimeShadow(sc2), 1.0 - smoothstep(120.0, 180.0, dist));
                    col *= lerp(0.9, 1.0, shadow);
                }
                #endif

                // The road of sun: narrow across and long towards the horizon, as light glances off a rough surface.
                float3 Rs = normalize(reflect(-Vw, normalize(float3(macro.x + nd.x * 0.18, 1.0, macro.z + nd.y * 0.18))));
                float3 flatR = normalize(float3(Rs.x, 0.0001, Rs.z));
                float3 flatS = normalize(float3(_SunDir.x, 0.0001, _SunDir.z));
                float dAz = 1.0 - saturate(dot(flatR, flatS));
                float elDiff = abs(asin(saturate(Rs.y)) - asin(saturate(_SunDir.y)));
                float road = exp(-dAz * lerp(70.0, 300.0, saturate(dist / 1800.0))) * exp(-elDiff * 2.4);
                road *= 0.62 + 0.38 * mid;

                // Sparkle: tiny mirrors flicking the sun back. Only faces turned just right flash, so it twinkles.
                float3 H = normalize(Vw + _SunDir);
                float3 Ns = normalize(float3(macro.x * 0.5 + (nd.x + c1.x * 0.6) * 0.34, 1.0, macro.z * 0.5 + (nd.y + c1.y * 0.6) * 0.34));
                float NoH = saturate(dot(Ns, H));
                float n2 = NoH * NoH; float n4 = n2 * n2; float n8 = n4 * n4; float n16 = n8 * n8; float n64 = n16 * n16; n64 *= n64;
                float n256 = n64 * n64; float n1024 = n256 * n256;
                float glint = lerp(n1024 * 1.4 + n256 * 0.22, n256 * 0.45 + n64 * 0.08, smoothstep(50.0, 500.0, dist));
                float cell = Hash21(floor(P.xz * lerp(2.2, 0.28, saturate(dist / 900.0))));
                float twinkle = step(0.55, cell) * (0.5 + 0.5 * sin(t * (2.0 + 5.0 * cell) + cell * 40.0));
                float sparkleTerm = glint * (0.45 + 1.6 * twinkle);
                float sunUp = saturate(_SunDir.y * 8.0 + 0.2);
                col += _SunCol * (road * 0.34 + sparkleTerm) * lerp(0.25, 1.0, shadow) * sunUp * (1.0 + _Glory * 0.6);

                // Foam: crests, and bands that wash on to every shore.
                float fm = 0;
                float2 fuv = P.xz / 17.0;
                float3 f1 = SAMPLE_TEXTURE2D(_Foam, sampler_Foam, fuv + float2(0.012, 0.018) * t).rgb;
                float3 f2 = SAMPLE_TEXTURE2D(_Foam, sampler_Foam, fuv.yx * 0.71 + float2(-0.015, 0.011) * t).rgb;
                float crest = saturate((i.crest - 0.42) / 0.75);
                float lace = f1.r * f2.g + f2.r * f1.g * 0.6;
                fm = saturate(crest * crest * (lace * 1.5 + f1.g * 0.5)) * near_;
                float shore = 1.0 - smoothstep(0.255, 0.33, depth);
                float bands = 0.5 + 0.5 * sin((depth - 0.25) * 150.0 + t * 0.9 + f2.g * 3.5);
                float wash = shore * (bands * 0.72 + 0.3) * (0.32 + 0.9 * lace + 0.4 * f1.g);
                float edgeLine = smoothstep(0.272, 0.25, depth);
                fm = saturate(fm + wash + edgeLine * (0.55 + lace));
                float3 foamCol = lerp(_FoamShade, _FoamLit, 0.55 + 0.45 * saturate(dot(N, _SunDir) * 2.0 + 0.2));
                col = lerp(col, foamCol * lerp(0.75, 1.0, shadow), saturate(fm));

                if (_Flash > 0.0) col += _Flash * float3(1.0, 0.75, 0.55) * (0.04 + fres * 0.25);

                // The chart, in the water rather than on it, so haze still takes it.
                if (_Chart > 0.0 || _RouteFade > 0.0) col += Chart(P, dist);

                col = Haze(col, P, _WorldSpaceCameraPos);
                return float4(col, 1);
            }
            ENDHLSL
        }
    }
}
