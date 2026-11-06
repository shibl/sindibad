// The arcade around the machine, from a panorama. Below the horizon the picture is projected onto the floor, so the floor
// stays put under the cabinet when the camera moves instead of sliding around like a painted backdrop.
Shader "Sindibad/ArcadeSky"
{
    Properties
    {
        _Pano ("Panorama", 2D) = "black" {}
        _Exposure ("Exposure", Float) = 1
        _CaptureHeight ("Capture height", Float) = 1.3
        _CaptureZ ("Capture Z", Float) = -1.5
    }
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
            TEXTURE2D(_Pano); SAMPLER(sampler_Pano);
            CBUFFER_START(UnityPerMaterial)
                float _Exposure;
                float _CaptureHeight;
                float _CaptureZ;
            CBUFFER_END
            struct A { float4 pos : POSITION; };
            struct V { float4 cs : SV_POSITION; float3 dir : TEXCOORD0; };
            V vert(A a)
            {
                V v;
                v.cs = TransformObjectToHClip(a.pos.xyz);
                v.dir = a.pos.xyz;
                return v;
            }
            float4 frag(V i) : SV_Target
            {
                float3 d = normalize(i.dir);
                if (d.y < -0.0005)
                {
                    float3 cam = _WorldSpaceCameraPos;
                    float t = cam.y / max(-d.y, 0.0005);
                    float3 hit = cam + d * t;
                    float3 from = hit - float3(0, _CaptureHeight, _CaptureZ);
                    float3 grounded = normalize(from);
                    // Far out on the floor the projection hands back to the plain panorama.
                    d = normalize(lerp(grounded, d, smoothstep(6, 30, t)));
                }
                float2 uv = float2(atan2(d.x, d.z) / (2 * PI) + 0.5, asin(clamp(d.y, -1, 1)) / PI + 0.5);
                // Four offset taps keep the heavily enlarged, out of focus picture free of bilinear diamonds.
                float2 o = float2(1.0 / 1024, 1.0 / 512);
                float3 c = (SAMPLE_TEXTURE2D_LOD(_Pano, sampler_Pano, uv + o * float2(-0.75, -0.75), 0).rgb +
                            SAMPLE_TEXTURE2D_LOD(_Pano, sampler_Pano, uv + o * float2(0.75, -0.75), 0).rgb +
                            SAMPLE_TEXTURE2D_LOD(_Pano, sampler_Pano, uv + o * float2(-0.75, 0.75), 0).rgb +
                            SAMPLE_TEXTURE2D_LOD(_Pano, sampler_Pano, uv + o * float2(0.75, 0.75), 0).rgb) * 0.25;
                return float4(c * _Exposure, 1);
            }
            ENDHLSL
        }
    }
}
