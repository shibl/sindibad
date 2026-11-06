// The sky: a gradient that follows the sun, a disc with a wide soft glow, and painted clouds that drift.
Shader "Sindibad/Sky"
{
    Properties { }
    SubShader
    {
        Tags { "Queue" = "Background" "RenderType" = "Background" "RenderPipeline" = "UniversalPipeline" "PreviewType" = "Skybox" }
        Cull Off ZWrite Off
        Pass
        {
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "SailCommon.hlsl"
            TEXTURE2D(_DetailTex); SAMPLER(sampler_DetailTex);
            struct A { float4 pos : POSITION; };
            struct V { float4 cs : SV_POSITION; float3 dir : TEXCOORD0; };
            V vert(A a) { V v; v.cs = TransformObjectToHClip(a.pos.xyz); v.dir = a.pos.xyz; return v; }
            float4 frag(V i) : SV_Target
            {
                float3 d = normalize(i.dir);
                // Below the horizon there's only haze, which the far edge of the sea melts into.
                float3 up = float3(d.x, max(d.y, 0.0), d.z);
                float3 c = SkyGradient(up);
                float cover = 0.0;
                // Stars come out behind everything at the very end of the day.
                if (_Dusk > 0.55 && d.y > 0.0)
                {
                    float3 q = d * 300.0;
                    float3 g = floor(q);
                    float h = Hash21(g.xy + g.z * 13.1);
                    float tw = 0.6 + 0.4 * sin(_SailTime * (1.0 + h * 3.0) + h * 60.0);
                    float3 off = frac(q) - 0.5 - (frac(h * float3(3.1, 5.7, 9.3)) - 0.5) * 0.6;
                    float star = step(0.992, h) * smoothstep(0.17, 0.03, length(off)) * smoothstep(0.1, 0.4, d.y) * tw;
                    c += star * saturate((_Dusk - 0.55) * 2.2) * float3(1.0, 0.95, 0.85) * 1.1;
                }
                if (d.y > -0.002) c = AddClouds(c, up, 0.0, cover);
                // The sun's disc itself, only where no cloud covers it, with a tight corona.
                float a = saturate(dot(d, _SunDir));
                float disc = smoothstep(0.99975, 0.9999, a);
                c += _SunCol * disc * 7.0 * (1.0 - cover);
                float a4 = a * a; a4 *= a4;
                float a16 = a4 * a4; a16 *= a16;
                float a64 = a16 * a16; a64 *= a64;
                float a256 = a64 * a64; a256 *= a256;
                float a1024 = a256 * a256; a1024 *= a1024;
                c += _SunCol * a1024 * a1024 * a1024 * 0.55 * (1.0 - cover * 0.7);
                // The glory: when the light opens up, the whole sky around the sun lifts.
                c += _Glory * _SunCol * (0.03 + 0.2 * a64);
                return float4(c, 1);
            }
            ENDHLSL
        }
    }
}
