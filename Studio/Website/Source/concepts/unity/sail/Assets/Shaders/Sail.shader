// The sail. It's the one surface that moves like cloth: it fills with wind into a curved belly, shivers when it spills the wind,
// and the low sun comes through it. The pennant uses it too, as cloth with no belly and a lot of flutter.
Shader "Sindibad/Sail"
{
    Properties
    {
        _Fill ("Fill, signed by which way it bellies", Float) = 0
        _Luff ("Luff", Float) = 0
        _Belly ("Belly depth", Float) = 3
        _Flag ("Is a flag", Float) = 0
        _Lit ("Light seen through", Float) = 1
        _UDir ("Direction of U in the mesh", Vector) = (0, 0.63, 0.78, 0)
        _VDir ("Direction of V in the mesh", Vector) = (0, -1, 0, 0)
    }
    SubShader
    {
        Tags { "RenderType" = "Opaque" "RenderPipeline" = "UniversalPipeline" }
        Cull Off
        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
        #include "SailCommon.hlsl"
        CBUFFER_START(UnityPerMaterial)
            float _Fill, _Luff, _Belly, _Flag, _Lit; float4 _UDir, _VDir;
        CBUFFER_END
        float Shape(float2 uv)
        {
            float s = uv.x, t = uv.y;
            float k = max(sin(PI * saturate(s * 0.96 + 0.02)), 0.0);
            // Fullest low and aft, and pinned along the yard.
            t = saturate(t);
            return k * sqrt(k) * (1.0 - pow(1.0 - t, 2.2)) * (1.05 - t * 0.4);
        }
        void Displace(inout float3 os, float3 n, float2 uv, out float offs)
        {
            if (_Flag > 0.5)
            {
                float w = sin(uv.x * 11.0 - _SailTime * 9.0) * 0.22 + sin(uv.x * 23.0 - _SailTime * 14.0) * 0.07;
                offs = w * uv.x * (0.6 + _Luff);
                return;
            }
            float belly = _Fill * Shape(uv) * _Belly;
            float rip = sin(uv.x * 26.0 + uv.y * 11.0 - _SailTime * 13.0) * 0.5 + sin(uv.x * 54.0 - uv.y * 16.0 - _SailTime * 19.0) * 0.25;
            float flutter = _Luff * rip * 0.5 * (0.3 + uv.y) * sin(PI * uv.x);
            // Even a full sail breathes.
            float breath = sin(_SailTime * 1.7 + uv.x * 3.0 + uv.y * 2.0) * 0.06 * abs(_Fill);
            offs = belly + flutter + breath;
        }
        ENDHLSL
        Pass
        {
            Tags { "LightMode" = "UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE
            #pragma multi_compile_fragment _ _SHADOWS_SOFT _SHADOWS_SOFT_LOW _SHADOWS_SOFT_MEDIUM _SHADOWS_SOFT_HIGH
            struct A { float4 pos : POSITION; float3 n : NORMAL; float4 col : COLOR; float2 uv : TEXCOORD0; };
            struct V { float4 cs : SV_POSITION; float3 w : TEXCOORD0; float3 n : TEXCOORD1; float2 uv : TEXCOORD2; float4 col : TEXCOORD3; };
            V vert(A a)
            {
                V o;
                float3 n = a.n; float offs, ox, oy;
                float3 p = a.pos.xyz;
                Displace(p, n, a.uv, offs);
                // Normal by finite differences over the sail's surface.
                float3 t = _UDir.xyz; float3 b = _VDir.xyz;
                float e = 0.03;
                Displace(p, n, a.uv + float2(e, 0), ox);
                Displace(p, n, a.uv + float2(0, e), oy);
                float su = _Flag > 0.5 ? 3.0 : 13.0, sv = _Flag > 0.5 ? 0.7 : 9.0;
                float3 nn = normalize(n - t * (ox - offs) / (e * su) - b * (oy - offs) / (e * sv));
                o.w = TransformObjectToWorld(p + n * offs);
                o.n = TransformObjectToWorldNormal(nn);
                o.uv = a.uv;
                o.col = float4(Linear(a.col.rgb), a.col.a);
                o.cs = TransformWorldToHClip(o.w);
                return o;
            }
            float4 frag(V i, bool front : SV_IsFrontFace) : SV_Target
            {
                float3 N = normalize(i.n) * (front ? 1.0 : -1.0);
                float3 Vw = normalize(_WorldSpaceCameraPos - i.w);
                float3 L = _SunDir;
                float3 base = i.col.rgb;
                if (_Flag < 0.5)
                {
                    // Cloth panels running down from the yard, each its own age, with stitched seams.
                    float s = i.uv.x * 11.0;
                    float id = floor(s);
                    float panel = frac(s);
                    float h = frac(sin(id * 12.9898) * 43758.5453);
                    base *= 0.88 + 0.14 * h;
                    float seam = smoothstep(0.42, 0.47, abs(panel - 0.5));
                    base *= 1.0 - 0.17 * seam;
                    // A band of the studio's pink low on the sail, and a thin line of teal above it.
                    float t = i.uv.y;
                    float3 pink = float3(0.92, 0.08, 0.26);
                    float3 teal = float3(0.02, 0.26, 0.28);
                    float pb = smoothstep(0.785, 0.79, t) * smoothstep(0.9, 0.895, t);
                    base = lerp(base, pink, pb * 0.92);
                    float tb = smoothstep(0.75, 0.753, t) * smoothstep(0.77, 0.767, t);
                    base = lerp(base, teal, tb * 0.9);
                    // A hint of weathering along the foot, and the cloth darker where it gathers under the yard.
                    base *= 1.0 - 0.1 * smoothstep(0.82, 1.0, t);
                    base *= 0.84 + 0.16 * smoothstep(0.0, 0.16, t);
                }
                float ndl = dot(N, L);
                float shadow = 1.0;
                #if defined(_MAIN_LIGHT_SHADOWS) || defined(_MAIN_LIGHT_SHADOWS_CASCADE)
                shadow = MainLightRealtimeShadow(TransformWorldToShadowCoord(i.w + N * 0.15));
                #endif
                float h2 = N.y * 0.5 + 0.5;
                float3 amb = lerp(_AmbDown, _AmbUp, h2);
                float3 front_ = _SunCol * 0.5 * saturate(ndl * 0.9 + 0.1) * lerp(0.3, 1.0, shadow);
                // The sun coming through the cloth from behind: this is the sail's glow.
                float through = saturate(-ndl);
                float3 thru = _SunCol * base * through * (0.2 + through) * 0.55 * float3(1.0, 0.82, 0.58) * _Lit;
                float3 col = base * (front_ + amb) + thru * lerp(0.35, 1.0, shadow);
                float rim = pow(1.0 - saturate(abs(dot(N, Vw))), 4.0);
                col += rim * _SunCol * 0.1;
                col = Haze(col, i.w, _WorldSpaceCameraPos);
                return float4(col, 1);
            }
            ENDHLSL
        }
        Pass
        {
            Name "ShadowCaster"
            Tags { "LightMode" = "ShadowCaster" }
            ZWrite On ZTest LEqual ColorMask 0 Cull Off
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            float3 _LightDirection;
            struct A { float4 pos : POSITION; float3 n : NORMAL; float2 uv : TEXCOORD0; };
            struct V { float4 cs : SV_POSITION; };
            V vert(A a)
            {
                V o;
                float offs; float3 p = a.pos.xyz;
                Displace(p, a.n, a.uv, offs);
                float3 w = TransformObjectToWorld(p + a.n * offs);
                float3 n = TransformObjectToWorldNormal(a.n);
                float4 c = TransformWorldToHClip(ApplyShadowBias(w, n, _LightDirection));
                #if UNITY_REVERSED_Z
                c.z = min(c.z, UNITY_NEAR_CLIP_VALUE);
                #else
                c.z = max(c.z, UNITY_NEAR_CLIP_VALUE);
                #endif
                o.cs = c;
                return o;
            }
            float4 frag(V i) : SV_Target { return 0; }
            ENDHLSL
        }
    }
}
