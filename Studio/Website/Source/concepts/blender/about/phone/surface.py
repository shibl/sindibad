# Turns a frame of hydro.py into the sea surface Cycles renders: a displaced sheet with leaning crests, depth colour, foam from the
# flow-advected lace, and spray as droplets and soft mist.
import bpy, math, os
import numpy as np
from common import *
import geometry as G


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def blur_np(a, s):
    if s <= 0:
        return a
    h, w = a.shape
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    g = np.exp(-2 * (math.pi * s) ** 2 * (fx * fx + fy * fy))
    return np.fft.irfft2(np.fft.rfft2(a) * g, s=(h, w)).astype(np.float32)


def mat_sea(lace_path):
    """Clear where it's thin, turquoise and then deep teal as it gets deeper, translucent to the sun, white where it's torn up."""
    m = material('Sea')
    n = N(m)
    tc = n('TexCoord')
    depth = n('Attribute', attribute_name='depth')
    foam_a = n('Attribute', attribute_name='foam')
    glow = n('Attribute', attribute_name='glow')
    far = n('Attribute', attribute_name='far')
    w1 = n('Attribute', attribute_name='w1')
    uv1 = n('UVMap', uv_map='adv0')
    uv2 = n('UVMap', uv_map='adv1')
    time_val = n('Value')
    time_val.name = 'Time'
    # Foam: a lacy pattern pushed about by the flow.
    lace_img = bpy.data.images.load(lace_path, check_existing=True)
    lace_img.colorspace_settings.name = 'Non-Color'
    lace1 = n('TexImage', image=lace_img, interpolation='Linear', extension='REPEAT')
    lace2 = n('TexImage', image=lace_img, interpolation='Linear', extension='REPEAT')
    lm1 = n('Mapping', inputs={'Scale': (2.4, 2.4, 1.0)})
    lm2 = n('Mapping', inputs={'Scale': (2.4, 2.4, 1.0)})
    n.link(uv1.outputs['UV'], lm1.inputs['Vector'])
    n.link(uv2.outputs['UV'], lm2.inputs['Vector'])
    n.link(lm1.outputs[0], lace1.inputs['Vector'])
    n.link(lm2.outputs[0], lace2.inputs['Vector'])
    lace = n.math('ADD', n.math('MULTIPLY', lace1.outputs['Color'], w1.outputs['Fac']), n.math('MULTIPLY', lace2.outputs['Color'], n.math('SUBTRACT', 1.0, w1.outputs['Fac'])))
    # Coverage rises with the foam field: thin streaks, then lace, then solid white.
    fine = n('TexNoise', noise_dimensions='4D', inputs={'Scale': 7.0, 'Detail': 4.0, 'Roughness': 0.5})
    n.link(tc.outputs['Object'], fine.inputs['Vector'])
    n.link(time_val.outputs[0], fine.inputs['W'])
    thresh = n.math('SUBTRACT', 0.98, n.math('MULTIPLY', foam_a.outputs['Fac'], float(os.environ.get('FOAM_K', 0.5))))
    v = n.math('SUBTRACT', n.math('ADD', lace, n.math('MULTIPLY', n.math('SUBTRACT', fine.outputs['Fac'], 0.5), 0.1)), thresh)
    foam = n.ramp(v, [(0.0, (0, 0, 0, 1)), (0.06, (0.6, 0.6, 0.6, 1)), (0.16, (1, 1, 1, 1))])
    # Small waves so it reads as a sea at this scale. Bump strength is kept by distance so it doesn't turn to noise far away.
    rip = n('TexNoise', noise_dimensions='4D', inputs={'Scale': 1.1, 'Detail': 7.0, 'Roughness': 0.56})
    n.link(tc.outputs['Object'], rip.inputs['Vector'])
    n.link(time_val.outputs[0], rip.inputs['W'])
    rip_m = n('Mapping', inputs={'Scale': (0.42, 0.42, 0.42)})
    n.link(tc.outputs['Object'], rip_m.inputs['Vector'])
    rip2 = n('TexNoise', noise_dimensions='4D', inputs={'Scale': 1.0, 'Detail': 4.0, 'Roughness': 0.5})
    n.link(rip_m.outputs[0], rip2.inputs['Vector'])
    n.link(n.math('MULTIPLY', time_val.outputs[0], 0.7), rip2.inputs['W'])
    height = n.math('ADD', n.math('MULTIPLY', rip.outputs['Fac'], 0.55), n.math('MULTIPLY', rip2.outputs['Fac'], 1.0))
    bump = n('Bump', inputs={'Strength': float(os.environ.get('RIP', 0.7)), 'Distance': 0.5})
    n.link(height, bump.inputs['Height'])
    # The body.
    k = float(os.environ.get('DEPTH_K', 0.5))
    body_f = n.math('SUBTRACT', 1.0, n.math('EXPONENT', n.math('MULTIPLY', depth.outputs['Fac'], -k)))
    body_col = n.ramp(n.math('DIVIDE', depth.outputs['Fac'], 7.0, True), [(0.0, '#58d8cc'), (0.12, '#1fb4b8'), (0.34, '#0c919f'), (0.7, '#0a7b8d'), (1.0, '#086a80')])
    diffuse = n('BsdfDiffuse', inputs={'Roughness': 0.0})
    n.link(body_col, diffuse.inputs['Color'])
    trans = n('BsdfTranslucent')
    n.link(n.mix(0.55, body_col, hx('#4fe4c9')), trans.inputs['Color'])
    n.link(bump.outputs[0], trans.inputs['Normal'])
    body = n('MixShader', inputs={0: 0.5} if False else {})
    body.inputs[0].default_value = float(os.environ.get('TRANSLUCENT', 0.42))
    n.link(diffuse.outputs[0], body.inputs[1])
    n.link(trans.outputs[0], body.inputs[2])
    # Light in the water from the screen under it.
    emit = n('Emission', inputs={'Color': hx('#37e0d2')})
    n.link(n.math('MULTIPLY', glow.outputs['Fac'], float(os.environ.get('GLOW', 0.5))), emit.inputs['Strength'])
    body2 = n('AddShader')
    n.link(body.outputs[0], body2.inputs[0])
    n.link(emit.outputs[0], body2.inputs[1])
    refr = n('BsdfRefraction', inputs={'IOR': 1.33, 'Roughness': 0.0, 'Color': hx('#e9fbf6')})
    n.link(bump.outputs[0], refr.inputs['Normal'])
    under = n('MixShader')
    n.link(body_f, under.inputs[0])
    n.link(refr.outputs[0], under.inputs[1])
    n.link(body2.outputs[0], under.inputs[2])
    # The surface: fresnel reflection on top of all that.
    gl = n('BsdfGlossy', inputs={'Roughness': 0.03, 'Color': hx('#e6e6e6')})
    cam_d = n('CameraData')
    n.link(n.math('ADD', 0.03, n.math('MULTIPLY', n.math('DIVIDE', cam_d.outputs['View Distance'], 700.0, True), float(os.environ.get('FAR_ROUGH', 0.26)))), gl.inputs['Roughness'])
    n.link(bump.outputs[0], gl.inputs['Normal'])
    fres = n('Fresnel', inputs={'IOR': 1.33})
    n.link(bump.outputs[0], fres.inputs['Normal'])
    lift = n('Value')
    lift.name = 'SeaLift'
    lift.outputs[0].default_value = 0.0
    n.link(n.mix(n.math('MULTIPLY', lift.outputs[0], 3.0, True), hx('#e6e6e6'), hx(os.environ.get('LIFT_REFL', '#c2e8f0'))), gl.inputs['Color'])
    scatter = n('Emission', inputs={'Color': hx(os.environ.get('LIFT_COL', '#07b3b8'))})
    n.link(n.math('MULTIPLY', lift.outputs[0], n.math('SUBTRACT', 1.0, n.math('MULTIPLY', fres.outputs[0], 0.8))), scatter.inputs['Strength'])
    surf0 = n('MixShader')
    n.link(fres.outputs[0], surf0.inputs[0])
    n.link(under.outputs[0], surf0.inputs[1])
    n.link(gl.outputs[0], surf0.inputs[2])
    surf = n('AddShader')
    n.link(surf0.outputs[0], surf.inputs[0])
    n.link(scatter.outputs[0], surf.inputs[1])
    # Foam on top.
    foam_bump = n('Bump', inputs={'Strength': 1.0, 'Distance': 0.55})
    n.link(lace, foam_bump.inputs['Height'])
    w_d = n('BsdfDiffuse')
    n.link(n.ramp(n.math('ADD', lace, n.math('MULTIPLY', n.math('SUBTRACT', fine.outputs['Fac'], 0.5), 0.5)), [(0.05, '#b5d4d6'), (0.32, '#eef6f5'), (0.6, '#ffffff')]), w_d.inputs['Color'])
    n.link(foam_bump.outputs[0], w_d.inputs['Normal'])
    w_t = n('BsdfTranslucent', inputs={'Color': hx('#fff6e3')})
    n.link(foam_bump.outputs[0], w_t.inputs['Normal'])
    w_e = n('Emission', inputs={'Color': hx('#f4f9f7'), 'Strength': float(os.environ.get('FOAM_E', 0.26))})
    w_m = n('MixShader')
    w_m.inputs[0].default_value = 0.34
    n.link(w_d.outputs[0], w_m.inputs[1])
    n.link(w_t.outputs[0], w_m.inputs[2])
    w_a = n('AddShader')
    n.link(w_m.outputs[0], w_a.inputs[0])
    n.link(w_e.outputs[0], w_a.inputs[1])
    final = n('MixShader')
    n.link(foam, final.inputs[0])
    n.link(surf.outputs[0], final.inputs[1])
    n.link(w_a.outputs[0], final.inputs[2])
    # Shadows of water are pale.
    lp = n('LightPath')
    tr = n('BsdfTransparent', inputs={'Color': hx('#d6efe7')})
    sh = n('MixShader')
    sh_fac = n.math('SUBTRACT', lp.outputs['Is Shadow Ray'], n.math('MULTIPLY', foam, 0.85), True)
    sh_fac2 = n.math('MINIMUM', sh_fac, n.math('SUBTRACT', 1.0, n.math('MULTIPLY', body_f, 0.6)))
    n.link(sh_fac2, sh.inputs[0])
    n.link(final.outputs[0], sh.inputs[1])
    n.link(tr.outputs[0], sh.inputs[2])
    out = n('OutputMaterial')
    n.link(sh.outputs[0], out.inputs[0])
    return m


def mat_spray():
    """Droplets small and bright. Big points are thin and soft, so they read as mist."""
    m = material('Spray')
    n = N(m)
    attr = n('Attribute', attribute_name='soft')
    facing = n('LayerWeight', inputs={'Blend': 0.5})
    edge = n.math('POWER', n.math('SUBTRACT', 1.0, facing.outputs['Facing'], True), 2.2)
    op = n.math('MULTIPLY', edge, float(os.environ.get('MIST_OP', 0.13)))
    white = n('BsdfDiffuse', inputs={'Color': hx('#ffffff')})
    wt = n('BsdfTranslucent', inputs={'Color': hx('#fff2d8')})
    wm = n('MixShader')
    wm.inputs[0].default_value = 0.6
    n.link(white.outputs[0], wm.inputs[1])
    n.link(wt.outputs[0], wm.inputs[2])
    drop = n('BsdfPrincipled', inputs={'Base Color': hx('#ffffff'), 'Roughness': 0.2, 'Emission Color': hx('#fff6e2'), 'Emission Strength': 0.32})
    tr = n('BsdfTransparent')
    soft = n('MixShader')
    n.link(op, soft.inputs[0])
    n.link(tr.outputs[0], soft.inputs[1])
    n.link(wm.outputs[0], soft.inputs[2])
    mx = n('MixShader')
    n.link(attr.outputs['Fac'], mx.inputs[0])
    n.link(drop.outputs[0], mx.inputs[1])
    n.link(soft.outputs[0], mx.inputs[2])
    out = n('OutputMaterial')
    n.link(mx.outputs[0], out.inputs[0])
    return m


def points_group():
    g = bpy.data.node_groups.get('ToPoints')
    if g:
        return g
    g = bpy.data.node_groups.new('ToPoints', 'GeometryNodeTree')
    g.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    g.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    i = g.nodes.new('NodeGroupInput')
    o = g.nodes.new('NodeGroupOutput')
    p = g.nodes.new('GeometryNodeMeshToPoints')
    a = g.nodes.new('GeometryNodeInputNamedAttribute')
    a.data_type = 'FLOAT'
    a.inputs['Name'].default_value = 'rad'
    g.links.new(i.outputs[0], p.inputs['Mesh'])
    g.links.new(a.outputs[0], p.inputs['Radius'])
    s = g.nodes.new('GeometryNodeSetMaterial')
    s.inputs['Material'].default_value = mat_spray()
    g.links.new(p.outputs[0], s.inputs['Geometry'])
    g.links.new(s.outputs[0], o.inputs[0])
    return g


class Surface:
    def __init__(self, sim_dir, col, stride=1):
        self.dir = sim_dir
        self.stride = stride
        g = np.load(os.path.join(sim_dir, 'grid.npz'))
        self.bed = g['bed']
        self.x0, self.x1, self.y0, self.y1 = float(g['x0']), float(g['x1']), float(g['y0']), float(g['y1'])
        self.n = int(g['n'])
        self.lace_world = float(g['lace_world'])
        self.wrinkle = g['wrinkle']
        self.dx = (self.x1 - self.x0) / self.n
        self.mat = mat_sea(os.path.join(sim_dir, 'lace.png'))
        self.ob = bpy.data.objects.new('SeaSheet', bpy.data.meshes.new('Sheet0'))
        col.objects.link(self.ob)
        self.spray_ob = bpy.data.objects.new('Spray', bpy.data.meshes.new('Spray0'))
        col.objects.link(self.spray_ob)
        self.spray_ob.modifiers.new('pts', 'NODES').node_group = points_group()
        xs = self.x0 + (np.arange(self.n, dtype=np.float32) + 0.5) * self.dx
        ys = self.y0 + (np.arange(self.n, dtype=np.float32) + 0.5) * self.dx
        self.XX, self.YY = np.meshgrid(xs, ys)

    def set_frame(self, f, time_value, level=None, spray=True, swell=None, edge_fade=0.0, eye=None):
        path = os.path.join(self.dir, f'h{f:04d}.npz')
        if not os.path.exists(path):
            self.ob.hide_render = True
            self.spray_ob.hide_render = True
            return
        d = np.load(path)
        h = d['h'].astype(np.float32)
        wet = h > 0.006
        self.ob.hide_render = False
        self.spray_ob.hide_render = False
        self.mat.node_tree.nodes['Time'].outputs[0].default_value = time_value
        eta = self.bed + h
        u = d['u'].astype(np.float32)
        v = d['v'].astype(np.float32)
        foam = d['foam'].astype(np.float32)
        dx = self.dx
        # A crest leans forward and sharpens: horizontal displacement from the local rise above the blurred surface, along the flow.
        eta_s = blur_np(eta, 0.08 / dx)
        # Where it's deep the shock fronts are softened into rounded shoulders; thin water keeps its edge.
        eta_d = blur_np(eta, 0.26 / dx)
        deep_m = smoothstep(0.25, 0.9, blur_np(h, 0.12 / dx))
        eta_s = eta_s + (eta_d - eta_s) * deep_m
        ext = blur_np(eta_s, 6.0 * 0.1 / dx)
        rise = np.clip(eta_s - ext, -0.3, 2.0)
        sp = np.hypot(u, v) + 1e-3
        lean = float(os.environ.get('LEAN', 0.55)) * smoothstep(0.03, 0.6, rise) * rise * np.minimum(sp / 5.0, 1.2)
        gx = (np.roll(eta_s, -1, 1) - np.roll(eta_s, 1, 1)) / (2 * dx)
        gy = (np.roll(eta_s, -1, 0) - np.roll(eta_s, 1, 0)) / (2 * dx)
        chop = float(os.environ.get('CHOP', 0.1))
        keep_edge = smoothstep(0.06, 0.45, h)
        ox = (u / sp * lean + np.clip(gx, -3, 3) * chop) * keep_edge
        oy = (v / sp * lean + np.clip(gy, -3, 3) * chop) * keep_edge
        # Wrinkles carried along by the flow: real relief on the faces of waves, stronger where it's running fast.
        S = self.wrinkle.shape[0]
        def tile(ax, ay):
            fx = (ax / self.lace_world % 1.0) * S
            fy = (ay / self.lace_world % 1.0) * S
            ix = fx.astype(np.int32) % S
            iy = fy.astype(np.int32) % S
            tx = fx - np.floor(fx)
            ty = fy - np.floor(fy)
            jx = (ix + 1) % S
            jy = (iy + 1) % S
            W_ = self.wrinkle
            return W_[iy, ix] * (1 - tx) * (1 - ty) + W_[iy, jx] * tx * (1 - ty) + W_[jy, ix] * (1 - tx) * ty + W_[jy, jx] * tx * ty
        w1 = float(d['w1'])
        wr = tile(d['a0x'], d['a0y']) * w1 + tile(d['a1x'], d['a1y']) * (1 - w1)
        amp = float(os.environ.get('WRINKLE', 0.2)) * smoothstep(0.1, 0.8, h) * (0.35 + 0.65 * smoothstep(1.0, 7.0, sp)) * (1 - smoothstep(100, 130, f))
        # Foam stands a little proud of the water.
        f_b = blur_np(foam, 1.2)
        e_m0 = np.minimum.reduce([self.XX - self.x0, self.x1 - self.XX, self.YY - self.y0, self.y1 - self.YY])
        edge_calm = smoothstep(4.0, 30.0, e_m0)
        zz = eta_s + f_b * 0.05 + wr * amp * edge_calm
        if level is not None:
            calm = smoothstep(112, 140, f)
            zz = zz + (level - zz) * calm
            # The last metres before the box's edge meet the open sea's flat level exactly.
            e_m = np.minimum.reduce([self.XX - self.x0, self.x1 - self.XX, self.YY - self.y0, self.y1 - self.YY])
            zz = zz + (level - zz) * (1 - smoothstep(0.0, 22.0, e_m))
            h = h + (level - h) * (1 - smoothstep(0.0, 22.0, e_m))
        if swell:
            zz = zz + swell(self.XX, self.YY)
        # Dry cells sink under the table so the wet line is a clean intersection. Wet cells next to the phone hug it.
        h_s = blur_np(h, 0.14 / dx)
        contact = smoothstep(0.006, 0.06, h_s)
        zz = (self.bed - 0.08) + (zz - (self.bed - 0.08)) * contact
        # Build the sheet only where it's wet, with a margin.
        st = self.stride
        keep = blur_np(wet.astype(np.float32), 1.5) > 0.002
        if st > 1:
            keep = keep[::st, ::st]
            X, Y, Z = (self.XX + ox)[::st, ::st], (self.YY + oy)[::st, ::st], zz[::st, ::st]
            DP, FM = h[::st, ::st], foam[::st, ::st]
            A0X, A0Y, A1X, A1Y = d['a0x'][::st, ::st], d['a0y'][::st, ::st], d['a1x'][::st, ::st], d['a1y'][::st, ::st]
        else:
            X, Y, Z = self.XX + ox, self.YY + oy, zz
            DP, FM = h, foam
            A0X, A0Y, A1X, A1Y = d['a0x'], d['a0y'], d['a1x'], d['a1y']
        H, W = X.shape
        idx = -np.ones((H, W), np.int32)
        idx[keep] = np.arange(keep.sum(), dtype=np.int32)
        quad = keep[:-1, :-1] & keep[1:, :-1] & keep[:-1, 1:] & keep[1:, 1:]
        qy, qx = np.nonzero(quad)
        old = self.ob.data
        me = bpy.data.meshes.new('Sheet')
        nv = int(keep.sum())
        nq = len(qy)
        if nv == 0 or nq == 0:
            self.ob.hide_render = True
            self.spray_ob.hide_render = True
            return
        co = np.stack([X[keep], Y[keep], Z[keep]], 1).astype(np.float32)
        loops = np.stack([idx[qy, qx], idx[qy, qx + 1], idx[qy + 1, qx + 1], idx[qy + 1, qx]], 1)
        me.vertices.add(nv)
        me.vertices.foreach_set('co', co.ravel())
        me.loops.add(nq * 4)
        me.polygons.add(nq)
        me.loops.foreach_set('vertex_index', loops.ravel())
        me.polygons.foreach_set('loop_start', np.arange(nq, dtype=np.int32) * 4)
        me.update(calc_edges=True)
        me.shade_smooth()
        # Per-vertex look data.
        me.attributes.new('depth', 'FLOAT', 'POINT').data.foreach_set('value', DP[keep].astype(np.float32))
        me.attributes.new('foam', 'FLOAT', 'POINT').data.foreach_set('value', FM[keep].astype(np.float32))
        x0, x1 = G.SCREEN_X0, G.SCREEN_X1
        y0, y1 = G.SCREEN_Y0, G.SCREEN_Y1
        gxm = smoothstep(x0 - 2.0, x0 + 0.6, X[keep]) * (1 - smoothstep(x1 - 0.6, x1 + 2.0, X[keep]))
        gym = smoothstep(y0 - 2.0, y0 + 0.6, Y[keep]) * (1 - smoothstep(y1 - 0.6, y1 + 2.0, Y[keep]))
        me.attributes.new('glow', 'FLOAT', 'POINT').data.foreach_set('value', (gxm * gym * np.exp(-DP[keep] * 0.25)).astype(np.float32))
        me.attributes.new('far', 'FLOAT', 'POINT').data.foreach_set('value', np.zeros(nv, np.float32))
        w1 = float(d['w1'])
        me.attributes.new('w1', 'FLOAT', 'POINT').data.foreach_set('value', np.full(nv, w1, np.float32))
        for name, ax, ay in (('adv0', A0X, A0Y), ('adv1', A1X, A1Y)):
            layer = me.uv_layers.new(name=name)
            lv = loops.ravel()
            uv = np.stack([ax[keep][lv] / self.lace_world, ay[keep][lv] / self.lace_world], 1).astype(np.float32)
            layer.uv.foreach_set('vector', uv.ravel())
        me.materials.append(self.mat)
        self.ob.data = me
        bpy.data.meshes.remove(old)
        # Spray.
        pts, rads, softs = [], [], []
        if spray and 'spray' in d and len(d['spray']):
            sp_ = d['spray'].astype(np.float32)
            r = np.random.default_rng(f)
            if eye is not None:
                sp_ = sp_[np.linalg.norm(sp_ - np.array(eye, np.float32), axis=1) > 9.0]
            keep_d = r.random(len(sp_)) < float(os.environ.get('DROPS', 0.42))
            pts.append(sp_[keep_d])
            rads.append(r.uniform(0.005, 0.014, int(keep_d.sum())))
            softs.append(np.zeros(int(keep_d.sum()), np.float32))
            keep_m = r.random(len(sp_)) < float(os.environ.get('MIST', 0.0))
            pts.append(sp_[keep_m])
            rads.append(r.uniform(0.2, 0.55, int(keep_m.sum())))
            softs.append(np.ones(int(keep_m.sum()), np.float32))
        old = self.spray_ob.data
        sm = bpy.data.meshes.new('Spray')
        if pts and sum(len(p) for p in pts):
            pp = np.concatenate(pts).astype(np.float32)
            sm.vertices.add(len(pp))
            sm.vertices.foreach_set('co', pp.ravel())
            sm.update()
            sm.attributes.new('rad', 'FLOAT', 'POINT').data.foreach_set('value', np.concatenate(rads).astype(np.float32))
            sm.attributes.new('soft', 'FLOAT', 'POINT').data.foreach_set('value', np.concatenate(softs).astype(np.float32))
        self.spray_ob.data = sm
        bpy.data.meshes.remove(old)
