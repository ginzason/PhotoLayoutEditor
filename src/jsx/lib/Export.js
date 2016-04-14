
/**
 * Canvas Class
 *
 * @param {int} width
 * @param {int} height
 * @param {string} bgColor
 *
 */
function Canvas(width, height, bgColor)
{
	this.el = document.createElement('canvas');
	this.ctx = this.el.getContext('2d');

	var size = {
		width : (width) ? width : 150,
		height : (height) ? height : 100
	};

	this.el.width = size.width;
	this.el.height = size.height;

	if (bgColor)
	{
		this.ctx.fillStyle = bgColor;
		this.ctx.fillRect(0, 0, size.width, size.height);
	}
}

/**
 * Make image
 *
 * @param {Object} options
 * @param {Function} callback
 */
function makeImage(options, callback)
{
	// set limit resampling count
	options.resampleCount = (options.resampleCount > 0) ? options.resampleCount : 0;
	options.resampleCount = (options.resampleCount < 4) ? options.resampleCount : 4;

	var resampleMax = Math.pow(2, options.resampleCount);
	var canvas = new Canvas(options.width * resampleMax, options.height * resampleMax, options.bgColor);

	// resize canvas
	var resizeCanvas = function(count, parentCanvas)
	{
		var max = Math.pow(2, count);
		var canvasForResize = new Canvas(options.width * max, options.height * max, options.bgColor);

		canvasForResize.ctx.drawImage(parentCanvas.el, 0, 0, parentCanvas.el.width * 0.5, parentCanvas.el.height * 0.5);

		if (count > 0)
		{
			resizeCanvas(count-1, canvasForResize);
		}
		else
		{
			if (callback)
			{
				callback(canvasForResize);
			}
		}
	};

	// init draw image
	canvas.ctx.drawImage(
		options.image,
		(options.cx), // cx
		(options.cy), // cy
		(options.cw), // cw
		(options.ch), // ch
		(options.dx * resampleMax), // dx
		(options.dy * resampleMax), // dy
		(options.dw * resampleMax), // dw
		(options.dh * resampleMax) // dh
	);

	if (options.resampleCount > 0)
	{
		resizeCanvas(options.resampleCount - 1, canvas);
	}
	else
	{
		if (callback)
		{
			callback(canvas);
		}
	}
}

/**
 * Get image size
 *
 * @param {String} type
 * @param {int} cw container width
 * @param {int} ch container height
 * @param {int} iw image width
 * @param {int} ih image height
 * @return {Object}
 */
function getImageSize(type, cw, ch, iw, ih)
{
	var size  = {
		width : 0,
		height : 0
	};

	switch(type)
	{
		case 'cover':
			if (cw > ch)
			{
				size.width = cw;
				size.height = ih * (cw / iw)
				if (ch > size.height)
				{
					size.width = iw * (ch / ih);
					size.height = ch;
				}
			}
			else
			{
				size.width = iw * (ch / ih);
				size.height = ch;
				if (cw > size.width)
				{
					size.width = cw;
					size.height = ih * (cw / iw);
				}
			}
			break;

		default:

			break;
	}

	return size;
}


module.exports = {

	container : null,
	gridster : null,

	
	/**
	 * init
	 * 
	 * @param {object} container
	 */
	init(container)
	{
		this.container = container;
		this.gridster = container.refs.gridster;
	},

	/**
	 * Object to json
	 *
	 * @param {Object} src
	 * @param {int} space
	 * @return {String}
	 */
	objectToJson(src, space)
	{
		return JSON.stringify(src, null, (space || 4));
	},

	/**
	 * Export gridster
	 *
	 * @return {Object}
	 */
	exportGridster()
	{
		const $gridster = this.gridster.$gridster;
		const gridster = this.gridster.gridster;
		var blockData = [];

		$gridster.find('li').each((k, o) => {
			const $o = $(o);
			var data = {};

			data.color = $o.data('color');

			if ($o.hasClass('attached'))
			{
				data.position = $o.children('figure').data('position');
				data.size = $o.children('figure').data('size');
				data.image = $o.children('figure').data('image');
			}

			blockData.push(data);
		});

		return {
			params : gridster.serialize(),
			figure : blockData
		};
	},

	/**
	 * Get ratio
	 *
	 * @param {int} w
	 * @param {int} h
	 * @return {int}
	 */
	getRatio(w, h)
	{
		var result = parseInt(w) / parseInt(h);
		result = Math.round(result * 1000) / 1000;
		return result;
	},

	/**
	 * Make queue
	 *
	 * @param {Object} gridsterData
	 * @return {Array}
	 */
	makeQueue(gridsterData)
	{
		var queue = [];
		var pref = this.container.state.preference;
		var getItemSize = (width, col, margin) => {
			return (width * col) + ((col > 1) ? margin * (col - 1) : 0);
		};

		gridsterData.figure.forEach((o, k) => {
			var param = gridsterData.params[k];
			if (o.image)
			{
				queue.push({
					key : k,
					image : o.image,
					position : o.position,
					size : o.size,
					targetWidth : getItemSize(pref.width, param.size_x, pref.inner_margin),
					targetHeight : getItemSize(pref.height, param.size_y, pref.inner_margin)
				});
			}
		});

		return queue;
	},

	/**
	 * Play queue
	 *
	 * @return {Object}
	 */
	playQueue(queue)
	{
		var max = queue.length;

		function draw(key)
		{
			var img = new Image();
			var data = queue[key];

			img.onload = (e) => {
				var realSize = {
					width: img.naturalWidth,
					height: img.naturalHeight
				};
				var size = {};
				var position = {};
				var option = null;

				if (data.size == 'cover')
				{
					size = getImageSize('cover', data.targetWidth, data.targetHeight, realSize.width, realSize.height);

					// TODO : 이미지 위치를 중앙으로 이동하도록 좌표잡기. position값으로..

					option = {
						image : img,
						resampleCount : 1,
						width : data.targetWidth,
						height : data.targetHeight,
						cx : 0,
						cy : 0,
						cw : realSize.width,
						ch : realSize.height,
						dx : 0,
						dy : 0,
						dw : size.width,
						dh : size.height,
						bgColor : '#dddddd'
					};
				}
				else
				{

				}

				makeImage(option, function(canvas){
					key += 1;
					document.body.appendChild(canvas.el);
					if (max > key)
					{
						draw(key);
					}
				});
			};
			img.src = data.image;
		}

		if (max > 0)
		{
			draw(0);
		}
	},


	/**
	 * Basic
	 *
	 * @return {Object}
	 */
	basic()
	{
		return {
			gridster : this.exportGridster(),
			preference : this.container.state.preference
		};
	},

	/**
	 * Packed
	 *
	 */
	packed()
	{
		var queue = this.makeQueue(this.exportGridster());
		this.playQueue(queue);
	}
};