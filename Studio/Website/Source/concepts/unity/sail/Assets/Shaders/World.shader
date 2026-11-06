// Everything solid: painted with vertex colours and lit in the game's own light, warm from the sun and blue-green from the sky.
// Materials pick what else it does: foliage that stirs and glows when backlit, planks, blossom that opens, lamps that light at dusk.
Shader "Sindibad/World"
{
    Properties
    {
        _Leaf ("Foliage", Float) = 0
        _Open ("Blossom open", Float) = 1
        _Blossom ("Is blossom", Float) = 0
        _Emit ("Emission", Float) = 0
        _EmitDusk ("Extra emission at dusk", Float) = 0
        _UseDetail ("Use plank map", Float) = 0
        _DetailTex ("Planks", 2D) = "white" {}
        _Gloss ("Gloss", Float) = 0
        _FogMul ("Haze", Float) = 1
        _Flap ("Wings", Float) = 0
        _Cull ("Cull", Float) = 2
        _Far ("Far silhouette", Float) = 0
        _Terrain ("Terrain detail", Float) = 0
        _Tint ("Tint", Color) = (1, 1, 1, 1)
    }
    SubShader
    {
        Tags { "RenderType" = "Opaque" "RenderPipeline" = "UniversalPipeline" }
        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
        #include "SailCommon.hlsl"
        CBUFFER_START(UnityPerMaterial)
            float _Leaf, _Open, _Blossom, _Emit, _EmitDusk, _UseDetail, _Gloss, _FogMul, _Flap, _Far, _Terrain, _Pad;
            float4 _Tint;
        CBUFFER_END
        TEXTURE2D(_DetailTex); SAMPLER(sampler_DetailTex);
        float _MirrorClip;   // 1 while the water's reflection draws

        float3 Deform(float3 w, float3 n, float4 col, float2 uv)
        {
            // Nothing below the water can be seen in the water, so it's pressed flat on to the surface.
            if (_MirrorClip > 0.5) w.y = max(w.y, 0.02);
            if (_Flap > 0.0)
            {
                // Small far-off birds beat their wings in the vertex shader: the further from the body, the more it moves.
                float ph = unity_ObjectToWorld._m03 * 0.31 + unity_ObjectToWorld._m23 * 0.47;
                w.y += sin(_SailTime * 9.0 + ph) * col.a * _Flap;
            }
            if (_Leaf > 0.5)
            {
                float ph = w.x * 0.21 + w.z * 0.17 + w.y * 0.1;
                float k = col.a;
                w.x += (sin(_SailTime * 1.9 + ph) + 0.5 * sin(_SailTime * 3.7 + ph * 2.1)) * 0.28 * k;
                w.z += cos(_SailTime * 1.6 + ph * 1.3) * 0.24 * k;
                w.y += sin(_SailTime * 2.3 + ph * 1.7) * 0.2 * k;
            }
            if (_Blossom > 0.5)
            {
                // Each puff stores its radius in U, so it can shrink to its own centre when closed.
                w -= n * (uv.x * 8.0) * (1.0 - _Open);
            }
            return w;
        }
        ENDHLSL
        Pass
        {
            Tags { "LightMode" = "UniversalForward" }
            Cull [_Cull]
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE
            #pragma multi_compile_fragment _ _SHADOWS_SOFT _SHADOWS_SOFT_LOW _SHADOWS_SOFT_MEDIUM _SHADOWS_SOFT_HIGH
            struct A { float4 pos : POSITION; float3 n : NORMAL; float4 col : COLOR; float2 uv : TEXCOORD0; };
            struct V { float4 cs : SV_POSITION; float3 w : TEXCOORD0; float3 n : TEXCOORD1; float4 col : TEXCOORD2; float2 uv : TEXCOORD3; };
            V vert(A a)
            {
                V o;
                float3 w = TransformObjectToWorld(a.pos.xyz);
                float3 n = TransformObjectToWorldNormal(a.n);
                w = Deform(w, n, a.col, a.uv);
                o.w = w; o.n = n; o.uv = a.uv;
                o.col = float4(Linear(a.col.rgb), a.col.a);
                o.cs = TransformWorldToHClip(w);
                return o;
            }
            float4 frag(V i, bool front : SV_IsFrontFace) : SV_Target
            {
                if (_Far > 0.5)
                {
                    // Far islands are just shapes in the air: bluish silhouettes that fade into the sky behind them.
                    float3 v0 = i.w - _WorldSpaceCameraPos;
                    float d0 = length(v0);
                    float k0 = 1.0 - exp(-d0 * _FogK * 1.1);
                    float3 up0 = float3(v0.x / d0, 0.012, v0.z / d0);
                    float3 hz = SkyGradient(normalize(up0));
                    float3 body0 = lerp(_Mid * 0.62 + _HorAnti * 0.12, _Mid * 0.5, saturate(i.w.y / 240.0));
                    return float4(lerp(body0, hz, k0 * 0.86), 1);
                }
                float3 N = normalize(i.n) * (front ? 1.0 : -1.0);
                float3 Vw = normalize(_WorldSpaceCameraPos - i.w);
                float3 L = _SunDir;
                float3 albedo = i.col.rgb * _Tint.rgb;
                if (_UseDetail > 0.5)
                {
                    float d = SAMPLE_TEXTURE2D(_DetailTex, sampler_DetailTex, i.uv * float2(0.14, 0.42)).r;
                    albedo *= lerp(1.0, d * 1.16, 0.85);
                }
                if (_Terrain > 0.5)
                {
                    // Vertex colours give the big shapes. Up close, this adds the brushwork: mottled grass and sand on the flat,
                    // and bands of strata on anything steep.
                    float3 fw = i.w;
                    float n1 = SAMPLE_TEXTURE2D(_DetailTex, sampler_DetailTex, fw.xz / 37.0 + fw.y * 0.008).g;
                    float n2 = SAMPLE_TEXTURE2D(_DetailTex, sampler_DetailTex, fw.xz / 11.0).b;
                    float n3 = SAMPLE_TEXTURE2D(_DetailTex, sampler_DetailTex, fw.zx / 5.0).g;
                    float steep = saturate((0.82 - N.y) * 2.2);
                    float band = 0.5 + 0.5 * sin(fw.y * 1.9 + n1 * 5.0 + sin(fw.y * 0.41 + fw.x * 0.02) * 2.0);
                    float band2 = 0.5 + 0.5 * sin(fw.y * 6.3 + n2 * 3.0);
                    float flatDetail = 0.8 + 0.3 * n1 + 0.22 * n3 + 0.14 * n2;
                    float rockDetail = 0.66 + 0.42 * band + 0.14 * band2 + 0.12 * n3;
                    albedo *= lerp(flatDetail, rockDetail, steep);
                }
                float ndl = dot(N, L);
                float wrap = _Leaf > 0.5 ? 0.55 : 0.22;
                float lit = saturate((ndl + wrap) / (1.0 + wrap));
                lit = lit * lit * (3.0 - 2.0 * lit) * 0.35 + lit * 0.65;
                float shadow = 1.0;
                #if defined(_MAIN_LIGHT_SHADOWS) || defined(_MAIN_LIGHT_SHADOWS_CASCADE)
                shadow = MainLightRealtimeShadow(TransformWorldToShadowCoord(i.w));
                #endif
                float3 sun = _SunCol * lit * lerp(0.22, 1.0, shadow);
                // Sky from above, and warm light bouncing back up off the water from below.
                float h = N.y * 0.5 + 0.5;
                float3 amb = lerp(_AmbDown, _AmbUp, h);
                float3 col = albedo * (sun + amb);
                // Rim: the side away from the sun still catches a warm edge against a bright sky.
                float rim = pow(1.0 - saturate(dot(N, Vw)), 4.0);
                float back = saturate(dot(-Vw, L) * 0.5 + 0.5);
                col += rim * back * back * _SunCol * (albedo * 0.5 + 0.03) * lerp(0.5, 1.0, shadow);
                if (_Leaf > 0.5)
                {
                    // Leaves let the sun through: when you look towards it they glow yellow-green at their edges.
                    float through = pow(saturate(dot(-Vw, L)), 3.0) * saturate(0.5 - ndl * 0.5);
                    col += albedo * float3(1.2, 1.25, 0.5) * _SunCol * through * 0.42;
                }
                if (_Gloss > 0.0)
                {
                    float3 H = normalize(L + Vw);
                    col += _SunCol * pow(saturate(dot(N, H)), 80.0) * _Gloss * shadow;
                }
                col += albedo * (_Emit + _EmitDusk * _Dusk);
                col = lerp(col, Haze(col, i.w, _WorldSpaceCameraPos), _FogMul);
                return float4(col, 1);
            }
            ENDHLSL
        }
        Pass
        {
            Name "ShadowCaster"
            Tags { "LightMode" = "ShadowCaster" }
            ZWrite On ZTest LEqual ColorMask 0 Cull [_Cull]
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            float3 _LightDirection;
            struct A { float4 pos : POSITION; float3 n : NORMAL; float4 col : COLOR; float2 uv : TEXCOORD0; };
            struct V { float4 cs : SV_POSITION; };
            V vert(A a)
            {
                V o;
                float3 w = TransformObjectToWorld(a.pos.xyz);
                float3 n = TransformObjectToWorldNormal(a.n);
                w = Deform(w, n, a.col, a.uv);
                float4 p = TransformWorldToHClip(ApplyShadowBias(w, n, _LightDirection));
                #if UNITY_REVERSED_Z
                p.z = min(p.z, UNITY_NEAR_CLIP_VALUE);
                #else
                p.z = max(p.z, UNITY_NEAR_CLIP_VALUE);
                #endif
                o.cs = p;
                return o;
            }
            float4 frag(V i) : SV_Target { return 0; }
            ENDHLSL
        }
    }
}
