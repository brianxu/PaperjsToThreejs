// 2D draw view
paper.install(window);
var modifyTool, drawTool, eraseTool;
window.onload = function () {
	// Get a reference to the canvas object
	var canvas = document.getElementById('myCanvas');
	// Create an empty project and a view for the canvas:
	paper.setup(canvas);
	// // Create a Paper.js Path to draw a line into it:
	// var path = new paper.Path();
	// // Give the stroke a color
	// path.strokeColor = 'black';
	// var start = new paper.Point(100, 100);
	// // Move to start and draw a line from there
	// path.moveTo(start);
	// // Note that the plus operator on Point objects does not work
	// // in JavaScript. Instead, we need to call the add() function:
	// path.lineTo(start.add([200, -50]));
	// // Draw the view now:
	// paper.view.draw();

	// Create a simple drawing tool:

	var view = paper.view;


	var values = {
		paths: 50,
		minPoints: 5,
		maxPoints: 15,
		minRadius: 30,
		maxRadius: 90
	};

	paper.settings.handleSize = 10;

	var hitOptions = {
		segments: true,
		stroke: true,
		fill: true,
		tolerance: 5
	};

	var compoundPath = null;

	modifyTool = new Tool();
	var segment, path;
	var movePath = false;
	modifyTool.onMouseDown = function (event) {
		segment = path = null;
		var hitResult = project.hitTest(event.point, hitOptions);
		if (!hitResult)
			return;

		if (event.modifiers.shift) {
			if (hitResult.type == 'segment') {
				hitResult.segment.remove();
			};
			return;
		}

		if (hitResult) {
			path = hitResult.item;
			if (hitResult.type == 'segment') {
				segment = hitResult.segment;
			} else if (hitResult.type == 'stroke') {
				var location = hitResult.location;
				segment = path.insert(location.index + 1, event.point);
				path.smooth();
			}
		}
		movePath = hitResult.type == 'fill';
		if (movePath)
			project.activeLayer.addChild(hitResult.item);
	}
	modifyTool.onMouseMove = function (event) {
		project.activeLayer.selected = false;
		if (event.item)
			event.item.selected = true;
	}
	modifyTool.onMouseDrag = function (event) {
		if (segment) {
			segment.point = segment.point.add(event.delta);
			path.smooth();
		} else if (path) {
			path.position = path.position.add(event.delta);
		}
	}
	modifyTool.onMouseUp = function (event) {
		updateGeometry();
	}

	drawTool = new Tool();
	eraseTool = new Tool();

	var addAndMoveToolDown = function (event) {
		path = new Path();
		path.strokeColor = 'black';
		path.strokeWidth = 5;
		path.add(event.point);
	};
	var addAndMoveToolDrag = function (event) {
		path.add(event.point);
	}
	drawTool.onMouseDown = addAndMoveToolDown;
	drawTool.onMouseDrag = addAndMoveToolDrag;
	drawTool.onMouseUp = function (event) {
		// path.selected = true;
		path.fillColor = 'red';
		path.closePath();
		path.simplify();
		if (compoundPath !== null) {
			var temp = compoundPath.unite(path);
			compoundPath.remove();
			compoundPath = temp;
		} else {
			compoundPath = path.clone();
		}
		path.remove();
		updateGeometry();
	}

	eraseTool.onMouseDown = addAndMoveToolDown;
	eraseTool.onMouseDrag = addAndMoveToolDrag;
	eraseTool.onMouseUp = function (event) {
		path.closePath();
		path.simplify();
		if (compoundPath !== null) {
			var temp = compoundPath.subtract(path);
			compoundPath.remove();
			compoundPath = temp;
		}
		path.remove();
		updateGeometry();
	}

	drawTool.activate();
	var updateGeometry = function () {
		var paths;
		if (compoundPath.children) {
			paths = compoundPath.children;
		} else {
			if (!compoundPath.clockwise) {
				compoundPath.reverse();
			}
			paths = [compoundPath];
		}
		var solidsHolesMap = getsolidsHolesMap(paths);
		console.log(compoundPath);
		var geometry = getExtrusionGeometry(JSON.parse(JSON.stringify(solidsHolesMap)));
		var material = new THREE.MeshPhongMaterial({ color: 0xdddddd, specular: 0x009900, shininess: 30, flatShading: true })
		var mesh = new THREE.Mesh(geometry, material);
		scene.add(mesh);
		scene.remove(extrudedMesh);
		extrudedMesh = mesh;

	}
}

// 3D extruded view
var renderer, stats, scene, camera, extrudedMesh;
function init() {
	var container = document.getElementById('canvas3D');

	//
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0xb0b0b0);
	//
	camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000);
	camera.position.set(0, 0, 200);
	//
	var group = new THREE.Group();
	scene.add(group);
	//
	var directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
	directionalLight.position.set(0.75, 0.75, 1.0).normalize();
	scene.add(directionalLight);
	var ambientLight = new THREE.AmbientLight(0xcccccc, 0.2);
	scene.add(ambientLight);

	var material = new THREE.MeshPhongMaterial({ color: 0xdddddd, specular: 0x009900, shininess: 30, flatShading: true })
	var geometry = new THREE.Geometry();
	extrudedMesh = new THREE.Mesh(geometry, material);
	scene.add(extrudedMesh);
	//
	var helper = new THREE.GridHelper(160, 10);
	helper.rotation.x = Math.PI / 2;
	group.add(helper);

	//
	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth / 2, window.innerHeight / 2);
	container.appendChild(renderer.domElement);
	//
	var controls = new THREE.OrbitControls(camera, renderer.domElement);
	//
	stats = new Stats();
	stats.dom.style.left = "50%";
	container.appendChild(stats.dom);
	//
	window.addEventListener('resize', onWindowResize, false);
}
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth / 2, window.innerHeight / 2);
}

function animate() {
	requestAnimationFrame(animate);
	render();
	stats.update();
}
function render() {
	renderer.render(scene, camera);
}
init();
animate();

// methods to transfer data from paperjs to threejs
var getsolidsHolesMap = function (paths) {
	var solids = [];
	var holes = [];
	var solidsHolesMap = {};
	var usedHolesMap = {};
	var allPaths = paths;
	allPaths.sort(function (a, b) { return Math.abs(b.area) - Math.abs(a.area) });
	//console.log(allPaths)
	allPaths.forEach(function (path) {
		// console.log(path.clockwise, path.area);
		if (path.clockwise) solids.push(path);
		else holes.push(path);
	})
	// console.log(solids, holes)
	// find solid and holes set
	solids.forEach(function (path) {
		solidsHolesMap[path.id] = {
			solids: path,
			holes: []
		};
		for (var i = 0; i < holes.length; ++i) {
			if (path.bounds.contains(holes[i].bounds) && !usedHolesMap[holes[i].id]) {
				solidsHolesMap[path.id].holes.push(holes[i]);
				usedHolesMap[holes[i].id] = true;
			}
		}
	});
	return solidsHolesMap;
}

var getExtrusionGeometry = function (solidsHolesMapData, thickness, curveSegments) {
	var shapes = [];
	var width = window.innerWidth / 2;
	var height = window.innerHeight / 2;
	var thickness = thickness || 10;
	var curveSegments = curveSegments || 10;
	var transferCoord = function (pos) {
		// move to the center
		pos.x -= width / 2;
		pos.y = height - pos.y - height / 2;
		// scale to half for better view
		pos.x /= 2;
		pos.y /= 2;
		return pos;
	}
	var getBezierPath = function (segments) {
		var bezierPath = new THREE.Shape();
		for (let i = 0; i < segments.length; ++i) {
			var curr = segments[i];
			var next = segments[(i + 1) % segments.length];
			var p = [];
			p[0] = transferCoord(new THREE.Vector2(curr[0][0], curr[0][1]));
			p[1] = transferCoord(new THREE.Vector2(curr[2][0] + curr[0][0], curr[2][1] + curr[0][1]));
			p[2] = transferCoord(new THREE.Vector2(next[1][0] + next[0][0], next[1][1] + next[0][1]));
			p[3] = transferCoord(new THREE.Vector2(next[0][0], next[0][1]));
			if (i == 0) {
				bezierPath.moveTo(p[0].x, p[0].y);
			}
			bezierPath.bezierCurveTo(
				p[1].x, p[1].y,
				p[2].x, p[2].y,
				p[3].x, p[3].y);
		}

		bezierPath.closePath();
		return bezierPath;
	}
	for (id in solidsHolesMapData) {
		var shape = solidsHolesMapData[id];
		var solidSegments = shape.solids[1].segments;
		var solidShape = getBezierPath(solidSegments);
		var holes = shape.holes;
		var holePaths = [];
		for (var i = 0; i < holes.length; ++i) {
			var holeSegments = holes[i][1].segments;
			var holePath = getBezierPath(holeSegments);
			holePaths.push(holePath);
		}
		solidShape.holes = holePaths;
		shapes.push(solidShape);
	}
	var settings = {
		amount: thickness,
		curveSegments: curveSegments,
		bevelEnabled: false,
		material: 0,
		extrudeMaterial: 1
	};

	var geometry = new THREE.ExtrudeGeometry(shapes, settings);
	return geometry;
}