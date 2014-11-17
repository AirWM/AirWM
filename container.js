/**
 * Rectangle: represents the location (x,y) and size (width,height) of a container
 */
function Rectangle(x,y,width,height){
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
}

/**
 * Container: represents a node in the tree structure of the windows
 * 
 * \param dimensions A rectangle containing the container's size and location
 * \param window The window id of a window (when the container is a leaf, otherwise null)
 * \param parent The parent node of the container
 * \param mode The tiling mode of the container, either horizontal or vertical
 */
function Container(dimensions,windowID,parent,mode){
	this.dimensions = dimensions;
	this.window = windowID;
	this.parent = parent;
	this.tiling_mode = mode;
	this.children = [];
	this.margin = 10;// The number of pixels between each window and the border
	
	/**
	 * Adds a child node to the list of children
	 * \param container The child node to be added
	 */
	this.addChild = function (container){
		var perc = 100/(children.length+1);
		setChildrenPercentages(perc);
		children.push({container: container, percentage: perc});
		//TODO:redraw children?
	}
	
	/**
	 * Sets the percentages of all children to perc
	 * \param perc The percentage that all children need to get 
	 */
	this.setChildrenPercentages = function (perc){
		for(var i=0; i<children.length; i++){
			children[i].percentage = perc;
		}
	};
	
	/**
	 * Sets the window attribute if this container is a leaf node, otherwise an error occurs
	 * \param windowID The window id of the window
	 */
	this.setWindow = function (windowID){
		if(children.length === 0)
			this.windowID = windowID;
			//TODO:draw window?
		else
			console.error("Cannot set the window attribute of a non-leaf node");
	}
	
	/**
	 * Switches the tiling mode from vertical to horizontal or vice versa
	 */
	this.switchTilingMode = function (){
		if(this.tiling_mode === "horizontal")
			this.tiling_mode = "vertical";
		else
			this.tiling_mode = "horizontal";
		//TODO:redraw children
	}
}