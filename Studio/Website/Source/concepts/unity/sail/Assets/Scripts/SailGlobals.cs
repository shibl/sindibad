using UnityEngine;

// Textures several shaders read at once. They're globals, so something has to keep them loaded and set them when the scene starts.
public class SailGlobals : MonoBehaviour
{
    public Texture clouds;
    public Texture refl;
    public Vector4 shoreST;
    public bool reflections = true;

    void Awake() { Apply(); }
    void Start() { Apply(); }

    public void Apply()
    {
        Shader.SetGlobalTexture("_CloudTex", clouds);
        Shader.SetGlobalTexture("_ReflTex", refl);
        Shader.SetGlobalVector("_ShoreST", shoreST);
        Shader.SetGlobalFloat("_ReflOn", reflections ? 1 : 0);
    }
}
