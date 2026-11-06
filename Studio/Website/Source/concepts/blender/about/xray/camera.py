# The one camera every pass shares. exec()'d or imported by every script, so all passes register exactly.
import math
CAM_LOC = (-50, -262, 96)
CAM_TARGET = (-36, 0, 12)
CAM_LENS = 43
SENSOR = 36
# Towards the sun: from the back left and low, so the land glows and the cliffs fall into teal shade.
SUN_DIR = (-0.62, 0.55, 0.42)

def setup_camera(ob, cam):
    from mathutils import Vector
    cam.lens = CAM_LENS
    cam.sensor_width = SENSOR
    cam.clip_start = 1
    cam.clip_end = 6000
    ob.location = CAM_LOC
    d = Vector(CAM_TARGET) - Vector(CAM_LOC)
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
