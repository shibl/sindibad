// Particles: spray, petals, sparks and lanterns. One premultiplied blend covers both, with `_Add` choosing how much light it adds.
Shader "Sindibad/Puff"
{
    Properties
    {
        _MainTex ("Sprite", 2D) = "white" {}
        _Add ("Additive", Float) = 0
        _Tint ("Tint", Color) = (1, 1, 1, 1)
        _Lit ("Takes the sun's light", Float) = 0
    }
    SubShader
    {
        Tags { "Queue" = "Transparent" "RenderType" = "Transparent" "RenderPipeline" = "UniversalPipeline" "IgnoreProjector" = "True" }
        ZWrite Off Blend One OneMinusSrcAlpha Cull Off
        Pass
        {
            Tags { "LightMode" = "UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "SailCommon.hlsl"
            TEXTURE2D(_MainTex); SAMPLER(sampler_MainTex);
            CBUFFER_START(UnityPerMaterial)
                float _Add, _Lit; float4 _Tint; float4 _MainTex_ST;
            CBUFFER_END
            struct A { float4 pos : POSITION; float4 col : COLOR; float2 uv : TEXCOORD0; };
            struct V { float4 cs : SV_POSITION; float4 col : TEXCOORD0; float2 uv : TEXCOORD1; float3 w : TEXCOORD2; };
            V vert(A a)
            {
                V o;
                o.w = TransformObjectToWorld(a.pos.xyz);
                o.cs = TransformWorldToHClip(o.w);
                o.col = a.col * _Tint; o.uv = a.uv;
                return o;
            }
            float4 frag(V i) : SV_Target
            {
                float4 s = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, i.uv);
                float a = s.a * i.col.a;
                float3 c = s.rgb * i.col.rgb;
                if (_Lit > 0.0) c *= lerp(float3(1, 1, 1), _SunCol * 0.72 + _AmbUp, _Lit);
                c = lerp(c, Haze(c, i.w, _WorldSpaceCameraPos), _Lit > 0.0 ? 1.0 : 0.0);
                return float4(c * a, a * (1.0 - _Add));
            }
            ENDHLSL
        }
    }
}
