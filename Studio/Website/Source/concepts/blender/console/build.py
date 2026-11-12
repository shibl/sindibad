"""Original Sindibad collectible handheld, Blender 5.2, no external models."""
import bpy,math,sys,struct,zlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'public/console';OUT.mkdir(parents=True,exist_ok=True);HERE=Path(__file__).resolve().parent;DRAFT='--draft' in sys.argv
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
ART=bpy.data.collections.new('Sindibad pocket console');bpy.context.scene.collection.children.link(ART)
def lin(h):
 a=[int(h[i:i+2],16)/255 for i in (0,2,4)];return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in a)
def mat(name,col,metal=0,rough=.3,trans=0,emit=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*lin(col),1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;p.inputs['Transmission Weight'].default_value=trans;p.inputs['IOR'].default_value=1.47;p.inputs['Coat Weight'].default_value=.3;p.inputs['Coat Roughness'].default_value=.15
 if emit:p.inputs['Emission Color'].default_value=(*lin(col),1);p.inputs['Emission Strength'].default_value=emit
 return m
SHELL=mat('ShellPink','FA2168',0,.17,.72);CORE=mat('Core','E7E7DA',.08,.26);CHROME=mat('Chrome','DFEEED',1,.15);PCB=mat('PCB','075452',.12,.4);GOLD=mat('Gold','D4AA58',.8,.24);DARK=mat('Seams','082E2E',.1,.3);SCREEN=mat('Screen','062524',.15,.2);EYE=mat('Eye','B8F5EE',0,.18,0,.7);MOUTH=mat('Mouth','B8F5EE',0,.18,0,.7);BLUE=mat('ButtonPearl','BBDDE3',.15,.2);PINK=mat('ButtonPink','F33175',.1,.2);INK=mat('Wordmark','185C59',.1,.3)
def add(o,name,material):
 o.name=name
 for c in list(o.users_collection):c.objects.unlink(o)
 ART.objects.link(o)
 if material:o.data.materials.append(material)
 return o
def bevel(o,w=.05,s=3):
 m=o.modifiers.new('Precision moulded radii','BEVEL');m.width=w;m.segments=s;m=o.modifiers.new('Clean weighted normals','WEIGHTED_NORMAL');return o
def box(name,loc,scale,m,w=.05):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=add(bpy.context.object,name,m);o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return bevel(o,w)
def mesh(name,vs,fs,m):
 data=bpy.data.meshes.new(name);data.from_pydata(vs,[],fs);data.update();o=bpy.data.objects.new(name,data);ART.objects.link(o);data.materials.append(m);return o
def line(name,pts,r,m):
 d=bpy.data.curves.new(name,'CURVE');d.dimensions='3D';d.bevel_depth=r;d.bevel_resolution=2;d.use_fill_caps=True;s=d.splines.new('POLY');s.points.add(len(pts)-1)
 for p,v in zip(s.points,pts):p.co=(*v,1)
 o=bpy.data.objects.new(name,d);ART.objects.link(o);d.materials.append(m);return o
def disk(name,x,y,z,r,depth,m):
 bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=r,depth=depth,location=(x,y,z),rotation=(math.pi/2,0,0));o=add(bpy.context.object,name,m);bevel(o,.023,2)
 for p in o.data.polygons:p.use_smooth=True
 return o
def rr(w,h,r,n=12):
 v=[]
 for x,z,a in [(w/2-r,h/2-r,0),(-w/2+r,h/2-r,90),(-w/2+r,-h/2+r,180),(w/2-r,-h/2+r,270)]:
  for i in range(n):
   t=math.radians(a+i/(n-1)*90);v.append((x+r*math.cos(t),z+r*math.sin(t)))
 return v
# Real hollow shell: two concentric rounded rectangles joined through depth.
outer=rr(2.45,3.8,.40);inner=rr(2.12,3.44,.29);N=len(outer);vs=[]
for y in [-.285,.285]:
 for ring in [outer,inner]:vs.extend((x,y,z) for x,z in ring)
fs=[]
for i in range(N):
 j=(i+1)%N
 fs.extend([(i,j,N+j,N+i),(2*N+i,3*N+i,3*N+j,2*N+j),(i,2*N+i,2*N+j,j),(N+i,N+j,3*N+j,3*N+i)])
shell=mesh('Translucent perimeter shell',vs,fs,SHELL);bevel(shell,.025,3)
for p in shell.data.polygons:p.use_smooth=True
core=box('Pearl structural core',(0,0,0),(2.17,.40,3.5),CORE,.28)
# A thin visible split line runs round the case middle.
line('Case joining seam',[(x,.035,z) for x,z in outer]+[(outer[0][0],.035,outer[0][1])],.008,PINK)
# Board sits within transparent rear casing; fine gold traces catch the side light.
box('Visible teal circuit board',(0,.225,0),(2.05,.035,3.34),PCB,.24)
for side in [-1,1]:
 for j in range(7):
  z=-1.25+j*.42;x=side*1.015
  box('Edge board component',(x,.205,z),(.075,.065,.11),DARK,.014)
  for k in [-1,1]:box('Gold solder pad',(x,.25,z+k*.07),(.085,.012,.027),GOLD,.005)
 for xoff in [.90,.95,1.0]:line('Gold edge traces',[(side*xoff,.25,-1.35),(side*xoff,.25,-.15),(side*(xoff-.15),.25,.05),(side*(xoff-.15),.25,1.3)],.005,GOLD)
# Back display of miniature components can be inspected when rotated.
box('Processor package',(0,.28,.35),(.58,.085,.65),DARK,.035)
for i in range(8):
 z=.10+i*.073
 for s in [-1,1]:box('Processor gold leg',(s*.34,.30,z),(.10,.015,.023),GOLD,.003)
for x,z in [(-.65,1),(.6,-.7),(-.7,-.8)]:box('PCB capacitor',(x,.30,z),(.12,.10,.23),CHROME,.025)
# Recessed screen bezel, then screen lens. Front points toward -Y.
box('Polished display bezel',(0,-.265,.70),(2.02,.12,1.72),CHROME,.18)
box('Display inner gasket',(0,-.332,.70),(1.94,.035,1.64),DARK,.155)
# Rounded screen is a planar fan with proper UVs; supports a live CanvasTexture.
outline=rr(1.86,1.54,.12);verts=[(0,-.355,.70)]+[(x,-.355,z+.70) for x,z in outline];faces=[(0,i+1,(i+1)%len(outline)+1) for i in range(len(outline))]
screen=mesh('DisplayScreen',verts,faces,SCREEN);uv=screen.data.uv_layers.new(name='DisplayUV')
for p in screen.data.polygons:
 for li in p.loop_indices:
  co=screen.data.vertices[screen.data.loops[li].vertex_index].co;uv.data[li].uv=(co.x/1.86+.5,(co.z-.70)/1.54+.5)
# Expressive face geometry for default poster and animation.
for name,x in [('FaceEyeL',-.29),('FaceEyeR',.29)]:
 eye=disk(name,x,-.371,.87,.085,.014,EYE);eye.scale.y=1.65
mouth=line('FaceMouth',[(-.29+ i/32*.58,0,.07-.14*math.sin(i/32*math.pi)) for i in range(33)],.026,MOUTH);mouth.location=(0,-.377,.43)
# Wordmark below the display, original small product typography.
bpy.ops.object.text_add(location=(0,-.246,-.31),rotation=(math.pi/2,0,0));word=add(bpy.context.object,'SINDIBAD engraved wordmark',INK);word.data.body='S I N D I B A D';word.data.align_x='CENTER';word.data.align_y='CENTER';word.data.size=.105;word.data.extrude=.001;word.data.resolution_u=4
# Metallic d-pad, one continuous cross with soft edges.
shape=[(-.09,.27),(.09,.27),(.09,.09),(.27,.09),(.27,-.09),(.09,-.09),(.09,-.27),(-.09,-.27),(-.09,-.09),(-.27,-.09),(-.27,.09),(-.09,.09)]
vs=[(x-.55,y,z-.83) for y in [-.255,-.365] for x,z in shape];fs=[tuple(range(11,-1,-1)),tuple(range(12,24))]
for i in range(12):fs.append((i,(i+1)%12,(i+1)%12+12,i+12))
vs=[(x+.55,y+.31,z+.83) for x,y,z in vs]
dpad=mesh('DPad',vs,fs,CHROME);dpad.location=(-.55,-.31,-.83);bevel(dpad,.035,3)
disk('Dpad seating gasket',-.55,-.233,-.83,.34,.025,DARK)
# Tactile action buttons with chrome collars.
for name,x,z,ma in [('ActionA',.65,-.70,BLUE),('ActionB',.89,-1.08,PINK)]:
 disk(name+' collar',x,-.255,z,.215,.035,CHROME)
 disk(name,x,-.328,z,.175,.11,ma)
# Small menu pill and speaker slots form the lower balance.
box('Menu pill',(0,-.25,-1.22),(.25,.07,.065),TEAL if 'TEAL' in globals() else INK,.032)
for i in range(5):box('Speaker slot',(-.66+i*.14,-.215,-1.49),(.047,.025,.16),DARK,.021)
# Purposeful screws and top/bottom ports.
for x,z in [(-.95,1.55),(.95,1.55),(-.95,-1.60),(.95,-1.60)]:
 disk('Captive shell screw',x,-.26,z,.038,.017,CHROME)
 line('Screw head slot',[(x-.022,-.273,z),(x+.022,-.273,z)],.006,DARK)
box('USB-C recess',(0,0,-1.889),(.36,.14,.025),DARK,.04);box('USB-C tongue',(0,0,-1.91),(.22,.035,.02),CHROME,.008)
for s in [-1,1]:box('Shoulder button',(s*.72,.02,1.88),(.55,.31,.085),CHROME,.04)
# Side power control and tiny gold status dot.
box('Side power button',(1.226,-.035,.8),(.06,.20,.30),CHROME,.025)
disk('Status LED',.79,-.264,-.32,.025,.014,EYE)
# Broad softbox studio.
def area(name,loc,power,size,col):
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='RECTANGLE';o.data.size=size[0];o.data.size_y=size[1];o.data.color=lin(col);o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
area('Broad ivory key',(-4,-6,6),900,(5,6),'FFF2E1');area('Cool sidebox',(5,-1,4),900,(3,5),'C2E9EE');area('Rear shell rim',(-2,4,3),1100,(4,4),'FFFFFF');area('Soft low return',(1,-4,-3),240,(4,2),'D7ECEC')
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=40 if DRAFT else 160;scene.cycles.use_denoising=True;scene.cycles.max_bounces=12;scene.cycles.transmission_bounces=8
scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(.16,.23,.21,1);scene.world.node_tree.nodes.get('Background').inputs[1].default_value=.3
scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=70 if DRAFT else 100;scene.render.film_transparent=True;scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
bpy.ops.object.camera_add(location=(4,-11,4));cam=bpy.context.object;cam.name='Pocket console product camera';cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=4.85;scene.camera=cam
bpy.ops.object.select_all(action='DESELECT')
for o in ART.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'console.glb'),export_format='GLB',use_selection=True,export_apply=True)
for screen_ in bpy.data.screens:
 for a in screen_.areas:
  if a.type=='VIEW_3D':a.spaces.active.region_3d.view_perspective='CAMERA';a.spaces.active.shading.type='MATERIAL';a.spaces.active.overlay.show_overlays=False
bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'console.blend'))
scene.render.image_settings.file_format='WEBP';scene.render.image_settings.color_mode='RGBA';scene.render.image_settings.quality=95;scene.render.filepath=str(OUT/'poster.webp');bpy.ops.render.render(write_still=True)
img=bpy.data.images.load(str(OUT/'poster.webp'),check_existing=False);pixels=list(img.pixels[:]);w,h=img.size[:];rows=[];bg=(1/255,63/255,59/255)
for y in range(h-1,-1,-1):
 row=bytearray([0])
 for x in range(w):
  i=(y*w+x)*4;alpha=pixels[i+3];row.extend(max(0,min(255,round((pixels[i+j]*alpha+bg[j]*(1-alpha))*255))) for j in range(3))
 rows.append(row)
def chunk(k,d):return struct.pack('>I',len(d))+k+d+struct.pack('>I',zlib.crc32(k+d)&0xffffffff)
Path('/tmp/sindibad-console-art/preview.png').write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows)))+chunk(b'IEND',b''))
print('CONSOLE_READY',str(OUT))
