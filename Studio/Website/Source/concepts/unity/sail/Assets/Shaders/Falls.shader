// Waterfalls running down a strip: streaks of white over green water, moving fast.
Shader "Sindibad/Falls"
{
    Properties { _Foam ("Foam", 2D) = "black" {} }
    SubShader
    {
        Tags { "RenderType" = "Opaque" "RenderPipeline" = "UniversalPipeline" }
        Pass
        {
            Tags { "LightMode" = "UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "SailCommon.hlsl"
            TEXTURE2D(_Foam); SAMPLER(sampler_Foam);
            CBUFFER_START(UnityPerMaterial)
                float _Pad;
            CBUFFER_END
            struct A { float4 pos : POSITION; float3 n : NORMAL; float2 uv : TEXCOORD0; };
            struct V { float4 cs : SV_POSITION; float3 w : TEXCOORD0; float3 n : TEXCOORD1; float2 uv : TEXCOORD2; };
            V vert(A a) { V o; o.w = TransformObjectToWorld(a.pos.xyz); o.n = TransformObjectToWorldNormal(a.n); o.uv = a.uv; o.cs = TransformWorldToHClip(o.w); return o; }
            float4 frag(V i) : SV_Target
            {
                float t = _SailTime;
                float s1 = SAMPLE_TEXTURE2D(_Foam, sampler_Foam, float2(i.uv.x * 0.8, i.uv.y * 0.35 - t * 0.55)).r;
                float s2 = SAMPLE_TEXTURE2D(_Foam, sampler_Foam, float2(i.uv.x * 0.42 + 0.3, i.uv.y * 0.2 - t * 0.33)).g;
                float w = saturate(s1 * 1.5 + s2 * 0.9);
                float3 N = normalize(i.n);
                float lit = saturate(dot(N, _SunDir) * 0.8 + 0.3);
                float3 water = lerp(float3(0.1, 0.5, 0.55), float3(0.92, 1.0, 1.0), w);
                float3 col = water * (_SunCol * lit + lerp(_AmbDown, _AmbUp, N.y * 0.5 + 0.5));
                float edge = smoothstep(0.0, 0.14, min(i.uv.x, 1.0 - i.uv.x));
                col = lerp(col * 0.72, col, edge);
                col = Haze(col, i.w, _WorldSpaceCameraPos);
                return float4(col, 1);
            }
            ENDHLSL
        }
    }
}
