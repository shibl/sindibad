# Turns the rendered frames into the page's video, using Blender's own encoder.
#   FRAMES_DIR=<dir> VIDEO=<path.mp4> CRF=MEDIUM W=1920 H=1080 Blender -b --factory-startup -P encode.py
import bpy, glob, os, struct
frames = sorted(glob.glob(os.path.join(os.environ['FRAMES_DIR'], 'f*.png')))
s = bpy.context.scene
ed = s.sequence_editor_create()
st = ed.strips.new_image('fly', frames[0], 1, 1, fit_method='ORIGINAL')
for f in frames[1:]: st.elements.append(os.path.basename(f))
st.frame_final_duration = len(frames)
s.frame_start, s.frame_end = 1, len(frames)
r = s.render
r.fps = 30
r.resolution_x, r.resolution_y, r.resolution_percentage = int(os.environ.get('W', 1920)), int(os.environ.get('H', 1080)), 100
r.use_sequencer = True
s.view_settings.view_transform = 'Standard'
im = r.image_settings
im.media_type = 'VIDEO'
im.file_format = 'FFMPEG'
im.color_mode = 'RGB'
ff = r.ffmpeg
ff.format, ff.codec = 'MPEG4', 'H264'
ff.constant_rate_factor = os.environ.get('CRF', 'MEDIUM')
ff.ffmpeg_preset = 'BEST'
ff.gopsize = 15
ff.audio_codec = 'NONE'
r.filepath = os.environ['VIDEO']
bpy.ops.render.render(animation=True)

# Blender writes the video's index at the end of the file. Moved to the front, a browser can start playing before it has it all.
def atoms(d, i, end):
    while i < end:
        n, t = struct.unpack('>I4s', d[i:i + 8])
        h = 8
        if n == 1: n, h = struct.unpack('>Q', d[i + 8:i + 16])[0], 16
        yield t, i, i + h, i + n
        i += n

def shift(moov, by):
    def walk(i, end):
        for t, a, body, z in atoms(moov, i, end):
            if t in (b'trak', b'mdia', b'minf', b'stbl'): walk(body, z)
            elif t == b'stco':
                c = struct.unpack('>I', moov[body + 4:body + 8])[0]
                for k in range(c):
                    o = body + 8 + k * 4
                    struct.pack_into('>I', moov, o, struct.unpack('>I', moov[o:o + 4])[0] + by)
            elif t == b'co64':
                c = struct.unpack('>I', moov[body + 4:body + 8])[0]
                for k in range(c):
                    o = body + 8 + k * 8
                    struct.pack_into('>Q', moov, o, struct.unpack('>Q', moov[o:o + 8])[0] + by)
    walk(8, len(moov))

data = open(os.environ['VIDEO'], 'rb').read()
top = {t: (a, z) for t, a, _, z in atoms(data, 0, len(data))}
a, z = top[b'moov']
moov = bytearray(data[a:z])
first = top[b'mdat'][0]
if a > first:
    shift(moov, len(moov))
    with open(os.environ['VIDEO'], 'wb') as f: f.write(data[:first] + bytes(moov) + data[first:a] + data[z:])
print('ENCODED', os.environ['VIDEO'], len(frames), 'frames', flush=True)
