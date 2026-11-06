// Soft toys. Short fibre scatters light past the terminator and glows at grazing angles, which plain PBR can't do, so this
// wraps the diffuse and adds a sheen. Vertex colour carries the printed details, such as a bear's muzzle and eyes.
Shader "Sindibad/Plush"
{
    Properties
    {
        _BaseColor ("Colour", Color) = (1, 1, 1, 1)
        _FibreMap ("Fibre normals", 2D) = "bump" {}
        _ValueMap ("Fibre value", 2D) = "white" {}
        _FibreScale ("Fibre strength", Range(0, 2)) = 1
        _Sheen ("Sheen", Range(0, 2)) = 0.7
        _Wrap ("Wrap", Range(0, 1)) = 0.45
    }
    SubShader
    {
        Tags { "RenderType" = "Opaque" "RenderPipeline" = "UniversalPipeline" "Queue" = "Geometry" }
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode" = "UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN
            #pragma multi_compile _ _ADDITIONAL_LIGHTS_VERTEX _ADDITIONAL_LIGHTS
            #pragma multi_compile_fragment _ _SHADOWS_SOFT
            #pragma multi_compile_fragment _ _SCREEN_SPACE_OCCLUSION
            #pragma multi_compile_fog
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/AmbientOcclusion.hlsl"

            TEXTURE2D(_FibreMap); SAMPLER(sampler_FibreMap);
            TEXTURE2D(_ValueMap); SAMPLER(sampler_ValueMap);
            CBUFFER_START(UnityPerMaterial)
                float4 _BaseColor;
                float4 _FibreMap_ST;
                float _FibreScale;
                float _Sheen;
                float _Wrap;
            CBUFFER_END

            struct A { float4 pos : POSITION; float3 nor : NORMAL; float4 tan : TANGENT; float2 uv : TEXCOORD0; float4 col : COLOR; };
            struct V { float4 cs : SV_POSITION; float3 ws : TEXCOORD0; float3 nor : TEXCOORD1; float4 tan : TEXCOORD2; float2 uv : TEXCOORD3; float4 col : COLOR; float3 sh : TEXCOORD4; };

            V vert(A a)
            {
                V v;
                VertexPositionInputs p = GetVertexPositionInputs(a.pos.xyz);
                VertexNormalInputs n = GetVertexNormalInputs(a.nor, a.tan);
                v.cs = p.positionCS;
                v.ws = p.positionWS;
                v.nor = n.normalWS;
                v.tan = float4(n.tangentWS, a.tan.w * GetOddNegativeScale());
                v.uv = TRANSFORM_TEX(a.uv, _FibreMap);
                v.col = a.col;
                v.sh = SampleSH(n.normalWS);
                return v;
            }

            float3 Shade(float3 albedo, float3 N, float3 V_, Light l, float fuzz)
            {
                float ndl = dot(N, l.direction);
                float wrap = saturate((ndl + _Wrap) / (1 + _Wrap));
                float3 c = l.color * l.distanceAttenuation * lerp(0.25, 1, l.shadowAttenuation);
                float rim = pow(1 - saturate(dot(N, V_)), 3);
                return c * (albedo * wrap * wrap + fuzz * rim * _Sheen * lerp(albedo, 1, 0.45) * saturate(ndl + 0.8) * 0.8);
            }

            float4 frag(V i) : SV_Target
            {
                float3 ts = UnpackNormalScale(SAMPLE_TEXTURE2D(_FibreMap, sampler_FibreMap, i.uv), _FibreScale);
                float3 base = normalize(i.nor);
                float3 bit = cross(base, i.tan.xyz) * i.tan.w;
                float3 N = normalize(ts.x * i.tan.xyz + ts.y * bit + ts.z * base);
                float3 V_ = normalize(_WorldSpaceCameraPos - i.ws);
                float val = SAMPLE_TEXTURE2D(_ValueMap, sampler_ValueMap, i.uv).r;
                // Black details are hard beads with a little shine, not fibre.
                float bead = saturate(1 - i.col.r * 8);
                float3 albedo = _BaseColor.rgb * i.col.rgb;
                albedo = lerp(albedo * val, albedo, bead);
                if (bead > 0.5) N = base;

                float4 shadowCoord = TransformWorldToShadowCoord(i.ws);
                Light main = GetMainLight(shadowCoord);
                float3 c = albedo * i.sh;
                float rimAmb = pow(1 - saturate(dot(N, V_)), 3);
                c += i.sh * rimAmb * _Sheen * lerp(albedo, 1, 0.45) * (1 - bead);
                c += Shade(albedo, N, V_, main, 1 - bead);
                #if defined(_ADDITIONAL_LIGHTS)
                uint n = GetAdditionalLightsCount();
                for (uint k = 0u; k < n; ++k)
                    c += Shade(albedo, N, V_, GetAdditionalLight(k, i.ws), 1 - bead);
                #endif
                if (bead > 0.5)
                {
                    float3 H = normalize(main.direction + V_);
                    c += pow(saturate(dot(base, H)), 90) * main.color * 0.6;
                    float3 R = reflect(-V_, base);
                    c += GlossyEnvironmentReflection(R, 0.1, 1) * 0.35;
                }
                return float4(c, 1);
            }
            ENDHLSL
        }
    }
    // The shadow, depth and depth-normal passes all come from the standard shader.
    Fallback "Universal Render Pipeline/Lit"
}
