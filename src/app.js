paper.install(window);
var modifyTool, drawTool;
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
	// console.log(view.size, Point.random(), view.size * Point.random());
	// createPaths();

	function createPaths() {
		var radiusDelta = values.maxRadius - values.minRadius;
		var pointsDelta = values.maxPoints - values.minPoints;
		for (var i = 0; i < values.paths; i++) {
			var radius = values.minRadius + Math.random() * radiusDelta;
			var points = values.minPoints + Math.floor(Math.random() * pointsDelta);
			var path = createBlob(view.size.multiply(Point.random()), radius, points);
			var lightness = (Math.random() - 0.5) * 0.4 + 0.4;
			var hue = Math.random() * 360;
			path.fillColor = { hue: hue, saturation: 1, lightness: lightness };
			path.strokeColor = 'black';
		};
	}

	function createBlob(center, maxRadius, points) {
		var path = new Path();
		path.closed = true;
		for (var i = 0; i < points; i++) {
			var delta = new Point({
				length: (maxRadius * 0.5) + (Math.random() * maxRadius * 0.5),
				angle: (360 / points) * i
			});
			path.add(center.add(delta));
		}
		path.smooth();
		return path;
	}

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

	drawTool = new Tool();

	drawTool.onMouseDown = function (event) {
		path = new Path();
		path.strokeColor = 'black';
		path.strokeWidth = 5;
		path.add(event.point);
	};
	drawTool.onMouseDrag = function (event) {
		path.add(event.point);
	}
	drawTool.onMouseUp = function (event) {
		path.selected = true;
		path.closePath();
		path.simplify();
	}

}