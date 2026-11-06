# Where everything is. World units are metres-ish; Z is up. The camera looks along +Y.
# Main island: the dock on the left end, then the village, the bridge, the lake, the forest and the hill with the goal flag.
WIRE_CELL = 3.2

MAIN_X = (-60, 230)
MAIN_Y = (-100, 125)
MAIN_LOBES = [(10, 0, 40, 40), (60, 8, 62, 58), (52, 62, 46, 34), (130, 25, 62, 66), (182, 30, 42, 60), (-20, -16, 26, 12), (32, -38, 30, 20), (92, -34, 34, 18)]
MAIN_CLIFF = 12
MAIN_SINK = 84
MAIN_SINK_FALL = 38

TERRACE = 6.4
HILLS = [((60, 52), 26, 36, True), ((6, 58), 14, 26, True), ((165, 40), 28, 36, True)]
PADS = [((2, 2), 18, None), ((60, 52), 8.0, None)]

DOCK = (-30, -21)
FLAG = (60, 52)
VILLAGE = (2, 2)

# dock -> village -> bridge -> lake shore -> forest gap -> up and round the hill
MAIN_PATH = [(-30, -21), (-18, -18), (-6, -10), (4, -2), (16, -4), (26, -13), (38, -17), (54, -14), (64, -4), (66, 10), (56, 22), (44, 34), (39, 52), (46, 70),
             (62, 77), (80, 71), (87, 53), (79, 36), (64, 32), (53, 40), (56, 50), (60, 52)]
SIDE_PATHS = [[(4, -2), (6, 22), (8, 44), (6, 58)], [(38, -17), (44, -34), (38, -50)], [(64, -6), (84, -14), (100, -36)]]
PATH_W = 2.4
BRIDGE = (32, -15.5)

RIVER = [(30, 62), (28, 54), (29, 42), (32, 28), (36, 12), (38, 2), (34, -8), (32, -18), (34, -32), (30, -44), (29, -60), (28, -78)]
RIVER_W = 3.0
LAKES = [(38, 12, 17, 10)]
SMALL_FALLS = [(84, 3.0, 60), (150, 3.6, 70), (-6, 2.0, 40)]

ISLANDS = [
    dict(name='light', seed=300, res=0.6, box=((-50, 240), (54, 332)), z=-26, lobes=[(-2, 285, 33, 26), (22, 294, 17, 15)], hills=[((-6, 288), 13, 17)],
         pads=[((-6, 288), 5.5, None)], cliff=8, sink=34, fall=18),
    dict(name='fort', seed=340, res=0.8, box=((210, 470), (390, 630)), z=-30, lobes=[(300, 550, 64, 44), (262, 528, 26, 18)], hills=[((306, 558), 24, 26)],
         pads=[((306, 558), 11, None)], cliff=10, sink=62, fall=26, facet=(8, 3.2)),
    dict(name='step_a', seed=380, res=0.4, box=((-24, -98), (6, -72)), z=2, lobes=[(-9, -85, 6.5, 5)], cliff=3, sink=9, fall=5, roll=0.6, rough=0.3, warp=1.6, fine=0.6, facet=(3, 1.6)),
    dict(name='step_b', seed=390, res=0.4, box=((-4, -116), (24, -92)), z=-8, lobes=[(10, -104, 5.8, 4.6)], cliff=3, sink=8, fall=5, roll=0.6, rough=0.3, warp=1.6, fine=0.6, facet=(3, 1.6)),
    dict(name='step_c', seed=400, res=0.4, box=((-40, -116), (-12, -92)), z=-14, lobes=[(-26, -104, 5.4, 4.2)], cliff=3, sink=8, fall=5, roll=0.6, rough=0.3, warp=1.6, fine=0.6, facet=(3, 1.6)),
    dict(name='far_a', seed=420, res=1.6, box=((110, 980), (340, 1170)), z=-84, lobes=[(225, 1075, 84, 62)], hills=[((215, 1080), 30, 40)], cliff=12, sink=70, fall=34, facet=(14, 6)),
    dict(name='near_rock', seed=460, res=0.5, box=((-128, -96), (-82, -50)), z=-54, lobes=[(-105, -73, 16, 14)], cliff=4, sink=18, fall=8, roll=1.5, rough=0.8, warp=3, fine=1.0, facet=(5, 2.4)),
]
