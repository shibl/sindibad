// The boat's wake: ribbons of foam lying on the waves. Age arrives in the vertex colour, and the lace comes from the foam map.
Shader "Sindibad/Wake"
{
    Properties { _Foam ("Foam", 2D) = "black" {} }
    SubShader
    {
        Tags { "Queue" = "Transparent-10" "RenderType" = "Transparent" "RenderPipeline" = "UniversalPipeline" "IgnoreProjector" = "True" }
        ZWrite Off Blend SrcAlpha OneMinusSrcAlpha Cull Off Offset -1, -1
        Pass
        {
            Tags { "LightMode" = "UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "SailCommon.hlsl"
            TEXTURE2D(_Foam); SAMPLER(sampler_Foam);
            float3 _FoamLit, _FoamShade;
            CBUFFER_START(UnityPerMaterial)
                float _Pad;
            CBUFFER_END
            struct A { float4 pos : POSITION; float4 col : COLOR; float2 uv : TEXCOORD0; };
            struct V { float4 cs : SV_POSITION; float3 w : TEXCOORD0; float4 col : TEXCOORD1; float2 uv : TEXCOORD2; float3 n : TEXCOORD3; };
            V vert(A a)
            {
                V o;
                float3 w = a.pos.xyz;
                float3 disp, n; float crest;
                SeaWaves(w.xz, 1.0, disp, n, crest);
                // Lay the ribbon on the same waves as the sea, a hair above it.
                w += disp + float3(0, 0.03, 0);
                o.w = w; o.n = n; o.col = a.col; o.uv = a.uv;
                o.cs = TransformWorldToHClip(w);
                return o;
            }
            float4 frag(V i) : SV_Target
            {
                float t = _SailTime;
                float3 f1 = SAMPLE_TEXTURE2D(_Foam, sampler_Foam, i.w.xz / 6.0 + float2(0.01, 0.015) * t).rgb;
                float3 f2 = SAMPLE_TEXTURE2D(_Foam, sampler_Foam, i.w.zx / 15.0 + float2(-0.012, 0.007) * t).rgb;
                float strength = i.col.a;          // young foam is dense, old foam thin lace, and then it's gone
                float across = 1.0 - abs(i.uv.x);
                across = smoothstep(0.0, 0.7, across);
                float lace = f1.r + f2.r * 0.7;
                float body = f1.g * f2.g * 1.5 + f1.b * 0.3;
                float n = lace * 0.75 + body * 0.8 + 0.3 * strength * across - (1.0 - across) * 0.7;
                float a = smoothstep(1.0 - strength * 0.95, 1.4 - strength * 0.7, n) * saturate(strength * 3.0);
                // Under the lace, a thin milky film holds the line together, so the foam reads as one wake rather than scattered marks.
                a = saturate(a * (0.5 + 0.6 * f2.g) + across * across * strength * 0.16);
                float3 c = lerp(_FoamShade, _FoamLit, saturate(0.45 + 0.55 * saturate(dot(i.n, _SunDir) * 3.0 + 0.3) + lace * 0.3));
                c = Haze(c, i.w, _WorldSpaceCameraPos);
                return float4(c, a * i.col.r * 0.92);
            }
            ENDHLSL
        }
    }
}
