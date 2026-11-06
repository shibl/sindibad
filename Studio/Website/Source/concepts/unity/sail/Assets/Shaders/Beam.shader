// Additive light in the air: the lighthouse's beam and the shafts through the cloud. V runs along the beam, U around it.
Shader "Sindibad/Beam"
{
    Properties
    {
        _Color ("Colour", Color) = (1, 0.9, 0.6, 1)
        _Soft ("Edge softness", Float) = 2
        _Len ("Falloff along", Float) = 1.5
    }
    SubShader
    {
        Tags { "Queue" = "Transparent" "RenderType" = "Transparent" "RenderPipeline" = "UniversalPipeline" "IgnoreProjector" = "True" }
        ZWrite Off Blend One One Cull Off
        Pass
        {
            Tags { "LightMode" = "UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "SailCommon.hlsl"
            CBUFFER_START(UnityPerMaterial)
                float4 _Color; float _Soft, _Len;
            CBUFFER_END
            struct A { float4 pos : POSITION; float3 n : NORMAL; float2 uv : TEXCOORD0; float4 col : COLOR; };
            struct V { float4 cs : SV_POSITION; float3 w : TEXCOORD0; float3 n : TEXCOORD1; float2 uv : TEXCOORD2; float4 col : TEXCOORD3; };
            V vert(A a)
            {
                V o;
                o.w = TransformObjectToWorld(a.pos.xyz);
                o.n = TransformObjectToWorldNormal(a.n);
                o.uv = a.uv; o.col = a.col;
                o.cs = TransformWorldToHClip(o.w);
                return o;
            }
            float4 frag(V i) : SV_Target
            {
                float3 Vw = normalize(_WorldSpaceCameraPos - i.w);
                float edge = pow(saturate(abs(dot(normalize(i.n), Vw))), _Soft);
                float along = pow(saturate(1.0 - i.uv.y), _Len);
                float dust = 0.82 + 0.18 * sin(i.w.y * 0.1 + i.w.x * 0.07 + _SailTime * 0.5);
                float3 c = _Color.rgb * _Color.a * edge * along * dust * i.col.a;
                return float4(c, 0);
            }
            ENDHLSL
        }
    }
}
