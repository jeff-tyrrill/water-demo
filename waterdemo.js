// Copyright 2016 Jeff Tyrrill
// MIT License
// 
// mail@jeff-tyrrill.com
// 
// 2016-12-07

var width = 48;
var height = 48;

var acceleration = 30;
var density = 128;

var rainLevels = [
    {label: 'Off', every: 0.07, multiple: 0},
    {label: 'Very light', every: 0.07, multiple: 1},
    {label: 'Light', every: 0.15, multiple: 1},
    {label: 'Mild', every: 0.25, multiple: 1},
    {label: 'Moderate', every: 0.50, multiple: 1},
    {label: 'Heavy', every: 0.75, multiple: 1},
    {label: 'Very heavy', every: 0.50, multiple: 2},
    {label: 'Torrent', every: 1, multiple: 2},
    {label: 'Blizzard', every: 1, multiple: 3}
];

var tickProcess = function(grid, drops, processor, doComputePressureMap) {
    var square, left, right, up, down, x, y, i;
    
    if (false && doComputePressureMap === true) { // level-finding ("pressure map") disabled for now because it causes worse results in many cases
        for (y = 0; y < height + 2; y++) {
            for (x = 0; x < width + 2; x++) {
                if (y == 0 || y == height + 1 || x == 0 || x == width + 1) {
                    grid[y][x].waterDensity = 0;
                } else {
                    grid[y][x].fillUpTo = height - 1;
                    grid[y][x].computedPressure = false;
                }
            }
        }
        
        for (y = 0; y < height + 2; y++) {
            for (x = 0; x < width + 2; x++) {
                square = grid[y][x];
                if (!square.computedPressure && square.waterDensity > 0) {
                    var pressureMapQueue = [];
                    var accumulatedMass = 0;
                    pressureMapQueue.push([x, y]);
                    var next = 0;
                    while (next < pressureMapQueue.length) {
                        var currentX = pressureMapQueue[next][0];
                        var currentY = pressureMapQueue[next][1];
                        next++;
                        
                        accumulatedMass += grid[currentY][currentX].waterDensity;
                        
                        if (!grid[currentY    ][currentX - 1].computedPressure && grid[currentY    ][currentX - 1].waterDensity > 0) { pressureMapQueue.push([currentX - 1, currentY    ]); grid[currentY    ][currentX - 1].computedPressure = true; }
                        if (!grid[currentY    ][currentX + 1].computedPressure && grid[currentY    ][currentX + 1].waterDensity > 0) { pressureMapQueue.push([currentX + 1, currentY    ]); grid[currentY    ][currentX + 1].computedPressure = true; }
                        if (!grid[currentY - 1][currentX    ].computedPressure && grid[currentY - 1][currentX    ].waterDensity > 0) { pressureMapQueue.push([currentX    , currentY - 1]); grid[currentY - 1][currentX    ].computedPressure = true; }
                        // if (!grid[currentY - 1][currentX - 1].computedPressure && grid[currentY - 1][currentX - 1].waterDensity > 0) { pressureMapQueue.push([currentX - 1, currentY - 1]); grid[currentY - 1][currentX - 1].computedPressure = true; }
                        // if (!grid[currentY - 1][currentX + 1].computedPressure && grid[currentY - 1][currentX + 1].waterDensity > 0) { pressureMapQueue.push([currentX + 1, currentY - 1]); grid[currentY - 1][currentX + 1].computedPressure = true; }
                        if (!grid[currentY + 1][currentX    ].computedPressure && grid[currentY + 1][currentX    ].waterDensity > 0) { pressureMapQueue.push([currentX    , currentY + 1]); grid[currentY + 1][currentX    ].computedPressure = true; }
                        // if (!grid[currentY + 1][currentX - 1].computedPressure && grid[currentY + 1][currentX - 1].waterDensity > 0) { pressureMapQueue.push([currentX - 1, currentY + 1]); grid[currentY + 1][currentX - 1].computedPressure = true; }
                        // if (!grid[currentY + 1][currentX + 1].computedPressure && grid[currentY + 1][currentX + 1].waterDensity > 0) { pressureMapQueue.push([currentX + 1, currentY + 1]); grid[currentY + 1][currentX + 1].computedPressure = true; }
                    }
                    
                    pressureMapQueue.sort(function(a, b) { // sort so that lowest squares are first
                        return (a[1] > b[1] ? -1 : 1);
                    });
                    
                    var fillUpTo = pressureMapQueue[Math.min(pressureMapQueue.length - 1, Math.floor(accumulatedMass / density))][1];
                    for (i = 0; i < pressureMapQueue.length; i++) {
                        grid[pressureMapQueue[i][1]][pressureMapQueue[i][0]].fillUpTo = fillUpTo;
                    }
                }
            }
        }
    }
    
    for (y = 0; y < height + 2; y++) {
        for (x = 0; x < width + 2; x++) {
            square = grid[y][x];
            if (y == 0 || y == height + 1 || x == 0 || x == width + 1) {
                // Border square
                square.waterDensity = 0;
            } else {
                // Non-border square
                if (square.waterDensity > 0 && !square.isBrick) {
                    left = grid[y][x - 1];
                    right = grid[y][x + 1];
                    up = grid[y - 1][x];
                    down = grid[y + 1][x];
                    
                    processor(square, left, right, up, down, drops, x, y);
                }
            }
        }
    }
    
    for (y = 0; y < height + 2; y++) {
        for (x = 0; x < width + 2; x++) {
            square = grid[y][x];
            if (y == 0 || y == height + 1 || x == 0 || x == width + 1) {
                square.waterDensity = 0;
                square.waterDensityNext = 0;
            } else {
                square.waterDensity += square.waterDensityNext;
                square.waterDensityNext = 0;
                
                if (square.waterDensity < 0.001) {
                    square.waterDensity = 0;
                }
            }
        }
    }
};

var flowDown = function(square, left, right, up, down, drops, x, y) {
    if (!down.isBrick) {
        if (down.waterDensity > 0) {
            var flowNormalRate = Math.max(0, (square.waterDensity - down.waterDensity) / 2.25);
            var flowToMaximumDensity;
            var flow;
            if (false && square.fillUpTo < y) {
                // Case where pressure should push the top of the water higher
                flowToMaximumDensity = flowNormalRate;
            } else {
                // Normal case
                flowToMaximumDensity = Math.max(0, density - down.waterDensity);
            }
            flow = Math.max(flowNormalRate, flowToMaximumDensity);
            flow = Math.min(square.waterDensity, flow);
            
            down.waterDensityNext += flow;
            square.waterDensityNext -= flow;
        } else {
            // Over empty space - convert standing water to drop
            drops.push({
                x: x * 1000,
                y: y * 1000,
                velocity: 500,
                mass: square.waterDensity / 1
            });
            square.waterDensityNext -= square.waterDensity / 1;
        }
    }
};

var flowUp = function(square, left, right, up, down, drops, x, y) {
    if (!up.isBrick) {
        var flowNormalRate = Math.max(0, (square.waterDensity - up.waterDensity) / 2.25);
        var flowFromMaximumDensity;
        if (false && square.fillUpTo < y - 1) {
            // Case where pressure should push the top of the water higher
            flowFromMaximumDensity = flowNormalRate;
        } else {
            // Normal case
            flowFromMaximumDensity = Math.max(0, square.waterDensity - density);
        }
        var flow = Math.min(flowNormalRate, flowFromMaximumDensity);
        
        up.waterDensityNext += flow;
        square.waterDensityNext -= flow;
    }
};

var flowLeft = function(square, left, right, up, down) {
    if (!left.isBrick) {
        var flow = Math.max(0, (square.waterDensity - left.waterDensity) / 2.25);

        left.waterDensityNext += flow;
        square.waterDensityNext -= flow;
    }
};

var flowRight = function(square, left, right, up, down) {
    if (!right.isBrick) {
        var flow = Math.max(0, (square.waterDensity - right.waterDensity) / 2.25);
        
        right.waterDensityNext += flow;
        square.waterDensityNext -= flow;
    }
};

var WaterDemo = React.createClass({
    getInitialState: function() {
        var grid = [];
        for (var y = 0; y < height + 2; y++) {
            var row = [];
            for (var x = 0; x < width + 2; x++) {
                row.push({
                    isBrick: false,
                    isYellowBrick: false,
                    isRedBrick: false,
                    waterDensity: 0,
                    waterDensityNext: 0,
                    fillUpTo: 46,
                    computedPressure: false
                });
            }
            grid.push(row);
        }
        return {
            frameRate: 20,
            rainRate: 3,
            pattern: 'custom',
            yellowBricksActive: true,
            redBricksActive: true,
            grid: grid,
            drops: [],
            tickNumber: 0,
            isMouseDown: false,
            mouseX: 0,
            mouseY: 0,
            tileMouseState: ''
        };
    },
    componentDidMount: function() {
        setTimeout(this.tick, 100);
    },
    setBrickState: function(x, y, state) {
        var grid = this.state.grid;
        var square = grid[y][x];
        
        var newState;
        if (state == 'brick') {
            newState = true;
        }
        if (state == 'clear') {
            newState = false;
        }
        if (state == 'toggle') {
            newState = !square.isBrick;
        }
        
        square.isBrick = newState;
        if (newState) {
            square.waterDensity = 0; // TODO: spread out water rather than deleting mass
        }
        square.isYellowBrick = false;
        square.isRedBrick = false;
        
        this.setState({grid: grid, pattern: 'custom'});
        
        return newState;
    },
    tileMouseDown: function(e) {
        var y = Math.floor(e.pageY / 8);
        var x = Math.floor(e.pageX / 8);
        
        var tileMouseState = this.setBrickState(x, y, 'toggle');
        
        this.setState({isMouseDown: true, mouseX: x, mouseY: y, tileMouseState: (tileMouseState ? 'brick' : 'clear')});
    },
    tileMouseMove: function(e) {
        if (this.state.isMouseDown) {
            var swap;
            
            var destY = Math.floor(e.pageY / 8);
            var destX = Math.floor(e.pageX / 8);
            
            var srcY = this.state.mouseY;
            var srcX = this.state.mouseX;
            
            var tileMouseState = this.state.tileMouseState;
            
            if (destY < srcY) {
                swap = destY;
                destY = srcY;
                srcY = swap;
            }
            if (destX < srcX) {
                swap = destX;
                destX = srcX;
                srcX = swap;
            }
            
            for (var y = srcY; y <= destY; y++) {
                for (var x = srcX; x <= destX; x++) {
                    this.setBrickState(x, y, tileMouseState);
                }
            }
        }
    },
    tileMouseUp: function() {
        this.setState({isMouseDown: false});
    },
    tick: function() {
        setTimeout(this.tick, 1000 / this.state.frameRate);
        
        var drops = this.state.drops;
        var grid = this.state.grid;
        var i, x, y;
        
        // Rain (randomly insert drops)
        if (Math.random() < rainLevels[this.state.rainRate].every) {
            for (i = 0; i < rainLevels[this.state.rainRate].multiple; i++) {
                drops.push({
                    x: (Math.floor(Math.random() * (width)) + 1) * 1000,
                    y: 0,
                    velocity: 0,
                    mass: 192
                });
            }
        }
        
        tickProcess(grid, drops, flowDown, true);
        for (i = 0; i < 64; i++) {
            tickProcess(grid, drops, flowUp, true);
            if (Math.random() > 0.5) {
                tickProcess(grid, drops, flowLeft);
                tickProcess(grid, drops, flowRight);
            } else {
                tickProcess(grid, drops, flowRight);
                tickProcess(grid, drops, flowLeft);
            }
        }
        
        // Process drops
        for (i = 0; i < drops.length; i++) {
            var drop = drops[i];
            
            // Make drop fall
            var oldY = drop.y;
            drop.y += drop.velocity;
            drop.velocity += acceleration;
            
            // If drop falls to bottom of grid, kill it
            if (drop.y / 1000 > height) {
                drop.mass = 0;
            }
            
            // If drop falls to brick, change it to grid water
            for (y = Math.floor(oldY / 1000); y <= Math.floor(drop.y / 1000); y++) {
                if (drop.mass > 0) {
                    var square = grid[y][Math.floor(drop.x / 1000)];
                    if (square.isBrick) {
                        while (square.isBrick) {
                            y--;
                            square = grid[y][Math.floor(drop.x / 1000)];
                        }
                        square.waterDensity += drop.mass;
                        drop.mass = 0;
                    }
                }
            }
        }
        
        // Cull "killed" drops
        var newDrops = [];
        for (i = 0; i < drops.length; i++) {
            if (drops[i].mass > 0) {
                newDrops.push(drops[i]);
            }
        }
        drops = newDrops;
        
        this.setState({grid: grid, drops: drops, tickNumber: this.state.tickNumber + 1});
    },
    frameRateDown: function() {
        var frameRate = this.state.frameRate;
        
        if (frameRate <= 5) {
            frameRate--;
        } else {
            frameRate -= 5;
        }
        
        this.setState({frameRate: frameRate});
    },
    frameRateUp: function() {
        var frameRate = this.state.frameRate;
        
        if (frameRate < 5) {
            frameRate++;
        } else {
            frameRate += 5;
        }
        
        this.setState({frameRate: frameRate});
    },
    rainRateDown: function() {
        this.setState({rainRate: this.state.rainRate - 1});
    },
    rainRateUp: function() {
        this.setState({rainRate: this.state.rainRate + 1});
    },
    applyPattern: function(e) {
        if (e.target.value != 'custom') {
            var grid = this.state.grid;
            var i, x, y;
            
            var patterns = {
                'buckets': {rainRate: 5, grid: [
                    // row 1
                    [6,  6,  6, 12], [6,  12, 12, 12], [12, 6, 12, 12],
                    [18, 6, 18, 12], [18, 12, 24, 12], [24, 6, 24, 12],
                    [30, 6, 30, 12], [30, 12, 36, 12], [36, 6, 36, 12],
                    // row 2
                    [12, 16, 12, 22], [12, 22, 18, 22], [18, 16, 18, 22],
                    [24, 16, 24, 22], [24, 22, 30, 22], [30, 16, 30, 22],
                    [36, 16, 36, 22], [36, 22, 42, 22], [42, 16, 42, 22],
                    // row 3
                    [6,  26,  6, 32], [6,  32, 12, 32], [12, 26, 12, 32],
                    [18, 26, 18, 32], [18, 32, 24, 32], [24, 26, 24, 32],
                    [30, 26, 30, 32], [30, 32, 36, 32], [36, 26, 36, 32],
                    // row 4
                    [12, 36, 12, 42], [12, 42, 18, 42], [18, 36, 18, 42],
                    [24, 36, 24, 42], [24, 42, 30, 42], [30, 36, 30, 42],
                    [36, 36, 36, 42], [36, 42, 42, 42], [42, 36, 42, 42],
                    // container
                    [0, 0, 0, 46], [47, 0, 47, 46], [0, 46, 47, 46]
                ],
                yellowBricks: [[6, 46], [7, 46], [8, 46], [14, 46], [15, 46], [16, 46], [26, 46], [27, 46], [28, 46], [38, 46], [39, 46], [40, 46]],
                redBricks:
                    [[7, 12], [11, 12], [19, 12], [23, 12], [31, 12], [35, 12],
                    [15, 22], [27, 22], [39, 22],
                    [9, 32], [21, 32], [33, 32],
                    [13, 42], [17, 42], [25, 42], [29, 42], [37, 42], [41, 42]]},
                'spillover': {rainRate: 3, grid: [
                    [0, 0, 0, 46], [47, 0, 47, 46], [9, 12, 46, 12], [1, 24, 47, 24], [1, 36, 46, 36], [0, 46, 47, 46],
                    [9, 20, 9, 23], [19, 20, 19, 23], [29, 20, 29, 23], [38, 20, 38, 23],
                    [9, 32, 9, 35], [19, 32, 19, 35], [29, 32, 29, 35], [38, 32, 38, 35]
                ],
                yellowBricks: [[39, 24], [40, 24], [41, 24], [42, 24], [43, 24], [44, 24], [45, 24], [46, 24]],
                redBricks: [[1, 36], [2, 36], [3, 36], [4, 36], [5, 36], [6, 36], [7, 36], [8, 36]]
                },
                'pachinko': {rainRate: 3, grid: [
                    [0, 0, 0, 46], [47, 0, 47, 46], [0, 46, 47, 46],
                    // [5, 8, 8, 8], [13, 8, 16, 8], [21, 8, 24, 8], [29, 8, 32, 8], [37, 8, 40, 8], [45, 8, 47, 8],
                    [1, 8, 46, 8],
                    [1, 12, 4, 12], [9, 12, 12, 12], [17, 12, 20, 12], [25, 12, 28, 12], [33, 12, 36, 12], [41, 12, 44, 12],
                    [5, 16, 8, 16], [13, 16, 16, 16], [21, 16, 24, 16], [29, 16, 32, 16], [37, 16, 40, 16], [45, 16, 47, 16],
                    [1, 20, 4, 20], [9, 20, 12, 20], [17, 20, 20, 20], [25, 20, 28, 20], [33, 20, 36, 20], [41, 20, 44, 20],
                    [5, 24, 8, 24], [13, 24, 16, 24], [21, 24, 24, 24], [29, 24, 32, 24], [37, 24, 40, 24], [45, 24, 47, 24],
                    [1, 28, 4, 28], [9, 28, 12, 28], [17, 28, 20, 28], [25, 28, 28, 28], [33, 28, 36, 28], [41, 28, 44, 28],
                    [5, 32, 8, 32], [13, 32, 16, 32], [21, 32, 24, 32], [29, 32, 32, 32], [37, 32, 40, 32], [45, 32, 47, 32],
                    [1, 36, 4, 36], [9, 36, 12, 36], [17, 36, 20, 36], [25, 36, 28, 36], [33, 36, 36, 36], [41, 36, 44, 36],
                    [5, 40, 8, 40], [13, 40, 16, 40], [21, 40, 24, 40], [29, 40, 32, 40], [37, 40, 40, 40], [45, 40, 47, 40]
                ],
                yellowBricks: [
                    [1, 8], [2, 8], [3, 8], [4, 8],
                    [9, 8], [10, 8], [11, 8], [12, 8],
                    [17, 8], [18, 8], [19, 8], [20, 8],
                    [25, 8], [26, 8], [27, 8], [28, 8],
                    [33, 8], [34, 8], [35, 8], [36, 8],
                    [41, 8], [42, 8], [43, 8], [44, 8]
                ],
                redBricks: [
                    [5, 46], [6, 46], [7, 46], [8, 46],
                    [13, 46], [14, 46], [15, 46], [16, 46],
                    [21, 46], [22, 46], [23, 46], [24, 46],
                    [29, 46], [30, 46], [31, 46], [32, 46],
                    [37, 46], [38, 46], [39, 46], [40, 46],
                    [45, 46], [46, 46]
                ]},
                'pipes': {rainRate: 5, grid: [
                    [0, 0, 0, 46], [47, 0, 47, 46], [0, 46, 22, 46], [25, 46, 46, 46],
                    [1, 8, 46, 8], [1, 12, 46, 12], [1, 16, 46, 16], [1, 20, 46, 20], [1, 24, 46, 24], [1, 28, 46, 28], [1, 32, 46, 32], [1, 36, 46, 36], [1, 40, 46, 40],
                    [4, 9, 4, 39], [8, 9, 8, 39], [12, 9, 12, 39], [16, 9, 16, 39], [20, 9, 20, 39], [24, 9, 24, 39], [28, 9, 28, 39], [32, 9, 32, 39], [36, 9, 36, 39], [40, 9, 40, 39], [44, 9, 44, 39]
                ],
                yellowBricks: [
                    // [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [15, 8], [16, 8], [17, 8], [18, 8], [19, 8], [20, 8], [21, 8], [22, 8], [23, 8], [24, 8], [25, 8], [26, 8], [27, 8], [28, 8], [29, 8], [30, 8], [31, 8], [32, 8], [33, 8], [34, 8], [35, 8], [36, 8], [37, 8], [38, 8], [39, 8], [40, 8], [41, 8], [42, 8], [43, 8], [44, 8], [45, 8], [46, 8],
                    [5, 8], [6, 8], [7, 8], [13, 8], [14, 8], [15, 8], [21, 8], [22, 8], [23, 8], [29, 8], [30, 8], [31, 8], [37, 8], [38, 8], [39, 8], [45, 8], [46, 8],
                    [1, 12], [2, 12], [3, 12], [9, 12], [10, 12], [11, 12], [17, 12], [18, 12], [19, 12], [25, 12], [26, 12], [27, 12], [33, 12], [34, 12], [35, 12], [41, 12], [42, 12], [43, 12],
                    [5, 16], [6, 16], [7, 16], [13, 16], [14, 16], [15, 16], [21, 16], [22, 16], [23, 16], [29, 16], [30, 16], [31, 16], [37, 16], [38, 16], [39, 16], [45, 16], [46, 16],
                    [1, 20], [2, 20], [3, 20], [9, 20], [10, 20], [11, 20], [17, 20], [18, 20], [19, 20], [25, 20], [26, 20], [27, 20], [33, 20], [34, 20], [35, 20], [41, 20], [42, 20], [43, 20],
                    [5, 24], [6, 24], [7, 24], [13, 24], [14, 24], [15, 24], [21, 24], [22, 24], [23, 24], [29, 24], [30, 24], [31, 24], [37, 24], [38, 24], [39, 24], [45, 24], [46, 24],
                    [1, 28], [2, 28], [3, 28], [9, 28], [10, 28], [11, 28], [17, 28], [18, 28], [19, 28], [25, 28], [26, 28], [27, 28], [33, 28], [34, 28], [35, 28], [41, 28], [42, 28], [43, 28],
                    [5, 32], [6, 32], [7, 32], [13, 32], [14, 32], [15, 32], [21, 32], [22, 32], [23, 32], [29, 32], [30, 32], [31, 32], [37, 32], [38, 32], [39, 32], [45, 32], [46, 32],
                    [1, 36], [2, 36], [3, 36], [9, 36], [10, 36], [11, 36], [17, 36], [18, 36], [19, 36], [25, 36], [26, 36], [27, 36], [33, 36], [34, 36], [35, 36], [41, 36], [42, 36], [43, 36],
                    [5, 40], [6, 40], [7, 40], [13, 40], [14, 40], [15, 40], [21, 40], [22, 40], [23, 40], [29, 40], [30, 40], [31, 40], [37, 40], [38, 40], [39, 40], [45, 40], [46, 40]
                ],
                redBricks: [
                    [1, 8], [2, 8], [3, 8], [9, 8], [10, 8], [11, 8], [17, 8], [18, 8], [19, 8], [25, 8], [26, 8], [27, 8], [33, 8], [34, 8], [35, 8], [41, 8], [42, 8], [43, 8],
                    [5, 12], [6, 12], [7, 12], [13, 12], [14, 12], [15, 12], [21, 12], [22, 12], [23, 12], [29, 12], [30, 12], [31, 12], [37, 12], [38, 12], [39, 12], [45, 12], [46, 12],
                    [1, 16], [2, 16], [3, 16], [9, 16], [10, 16], [11, 16], [17, 16], [18, 16], [19, 16], [25, 16], [26, 16], [27, 16], [33, 16], [34, 16], [35, 16], [41, 16], [42, 16], [43, 16],
                    [5, 20], [6, 20], [7, 20], [13, 20], [14, 20], [15, 20], [21, 20], [22, 20], [23, 20], [29, 20], [30, 20], [31, 20], [37, 20], [38, 20], [39, 20], [45, 20], [46, 20],
                    [1, 24], [2, 24], [3, 24], [9, 24], [10, 24], [11, 24], [17, 24], [18, 24], [19, 24], [25, 24], [26, 24], [27, 24], [33, 24], [34, 24], [35, 24], [41, 24], [42, 24], [43, 24],
                    [5, 28], [6, 28], [7, 28], [13, 28], [14, 28], [15, 28], [21, 28], [22, 28], [23, 28], [29, 28], [30, 28], [31, 28], [37, 28], [38, 28], [39, 28], [45, 28], [46, 28],
                    [1, 32], [2, 32], [3, 32], [9, 32], [10, 32], [11, 32], [17, 32], [18, 32], [19, 32], [25, 32], [26, 32], [27, 32], [33, 32], [34, 32], [35, 32], [41, 32], [42, 32], [43, 32],
                    [5, 36], [6, 36], [7, 36], [13, 36], [14, 36], [15, 36], [21, 36], [22, 36], [23, 36], [29, 36], [30, 36], [31, 36], [37, 36], [38, 36], [39, 36], [45, 36], [46, 36],
                    [1, 40], [2, 40], [3, 40], [9, 40], [10, 40], [11, 40], [17, 40], [18, 40], [19, 40], [25, 40], [26, 40], [27, 40], [33, 40], [34, 40], [35, 40], [41, 40], [42, 40], [43, 40]
                ]},
                'slopes': {rainRate: 4, grid: [
                    [0, 0, 0, 12], [47, 0, 47, 38],
                    [31, 38, 46, 38],
                    [46, 8, 46, 8],
                    [41, 8, 41, 8], [42, 9, 42, 9], [43, 10, 43, 10], [44, 11, 44, 11], [45, 12, 45, 12], [46, 13, 46, 13],
                    [36, 8, 36, 8], [37, 9, 37, 9], [38, 10, 38, 10], [39, 11, 39, 11], [40, 12, 40, 12], [41, 13, 41, 13], [42, 14, 42, 14], [43, 15, 43, 15], [44, 16, 44, 16], [45, 17, 45, 17], [46, 18, 46, 18],
                    [31, 8, 31, 8], [32, 9, 32, 9], [33, 10, 33, 10], [34, 11, 34, 11], [35, 12, 35, 12], [36, 13, 36, 13], [37, 14, 37, 14], [38, 15, 38, 15], [39, 16, 39, 16], [40, 17, 40, 17], [41, 18, 41, 18], [42, 19, 42, 19], [43, 20, 43, 20], [44, 21, 44, 21], [45, 22, 45, 22], [46, 23, 46, 23],
                    [26, 8, 26, 8], [27, 9, 27, 9], [28, 10, 28, 10], [29, 11, 29, 11], [30, 12, 30, 12], [31, 13, 31, 13], [32, 14, 32, 14], [33, 15, 33, 15], [34, 16, 34, 16], [35, 17, 35, 17], [36, 18, 36, 18], [37, 19, 37, 19], [38, 20, 38, 20], [39, 21, 39, 21], [40, 22, 40, 22], [41, 23, 41, 23], [42, 24, 42, 24], [43, 25, 43, 25], [44, 26, 44, 26], [45, 27, 45, 27], [46, 28, 46, 28],
                    [21, 8, 21, 8], [22, 9, 22, 9], [23, 10, 23, 10], [24, 11, 24, 11], [25, 12, 25, 12], [26, 13, 26, 13], [27, 14, 27, 14], [28, 15, 28, 15], [29, 16, 29, 16], [30, 17, 30, 17], [31, 18, 31, 18], [32, 19, 32, 19], [33, 20, 33, 20], [34, 21, 34, 21], [35, 22, 35, 22], [36, 23, 36, 23], [37, 24, 37, 24], [38, 25, 38, 25], [39, 26, 39, 26], [40, 27, 40, 27], [41, 28, 41, 28], [42, 29, 42, 29], [43, 30, 43, 30], [44, 31, 44, 31], [45, 32, 45, 32], [46, 33, 46, 33],
                    [16, 8, 16, 8], [17, 9, 17, 9], [18, 10, 18, 10], [19, 11, 19, 11], [20, 12, 20, 12], [21, 13, 21, 13], [22, 14, 22, 14], [23, 15, 23, 15], [24, 16, 24, 16], [25, 17, 25, 17], [26, 18, 26, 18], [27, 19, 27, 19], [28, 20, 28, 20], [29, 21, 29, 21], [30, 22, 30, 22], [31, 23, 31, 23], [32, 24, 32, 24], [33, 25, 33, 25], [34, 26, 34, 26], [35, 27, 35, 27], [36, 28, 36, 28], [37, 29, 37, 29], [38, 30, 38, 30], [39, 31, 39, 31], [40, 32, 40, 32], [41, 33, 41, 33], [42, 34, 42, 34], [43, 35, 43, 35], [44, 36, 44, 36], [45, 37, 45, 37], [46, 38, 46, 38],
                    [11, 8, 11, 8], [12, 9, 12, 9], [13, 10, 13, 10], [14, 11, 14, 11], [15, 12, 15, 12], [16, 13, 16, 13], [17, 14, 17, 14], [18, 15, 18, 15], [19, 16, 19, 16], [20, 17, 20, 17], [21, 18, 21, 18], [22, 19, 22, 19], [23, 20, 23, 20], [24, 21, 24, 21], [25, 22, 25, 22], [26, 23, 26, 23], [27, 24, 27, 24], [28, 25, 28, 25], [29, 26, 29, 26], [30, 27, 30, 27], [31, 28, 31, 28], [32, 29, 32, 29], [33, 30, 33, 30], [34, 31, 34, 31], [35, 32, 35, 32], [36, 33, 36, 33], [37, 34, 37, 34], [38, 35, 38, 35], [39, 36, 39, 36], [40, 37, 40, 37], [41, 38, 41, 38],
                    [6, 8, 6, 8], [7, 9, 7, 9], [8, 10, 8, 10], [9, 11, 9, 11], [10, 12, 10, 12], [11, 13, 11, 13], [12, 14, 12, 14], [13, 15, 13, 15], [14, 16, 14, 16], [15, 17, 15, 17], [16, 18, 16, 18], [17, 19, 17, 19], [18, 20, 18, 20], [19, 21, 19, 21], [20, 22, 20, 22], [21, 23, 21, 23], [22, 24, 22, 24], [23, 25, 23, 25], [24, 26, 24, 26], [25, 27, 25, 27], [26, 28, 26, 28], [27, 29, 27, 29], [28, 30, 28, 30], [29, 31, 29, 31], [30, 32, 30, 32], [31, 33, 31, 33], [32, 34, 32, 34], [33, 35, 33, 35], [34, 36, 34, 36], [35, 37, 35, 37], [36, 38, 36, 38],
                    [3, 10, 3, 10], [4, 11, 4, 11], [5, 12, 5, 12], [6, 13, 6, 13], [7, 14, 7, 14], [8, 15, 8, 15], [9, 16, 9, 16], [10, 17, 10, 17], [11, 18, 11, 18], [12, 19, 12, 19], [13, 20, 13, 20], [14, 21, 14, 21], [15, 22, 15, 22], [16, 23, 16, 23], [17, 24, 17, 24], [18, 25, 18, 25], [19, 26, 19, 26], [20, 27, 20, 27], [21, 28, 21, 28], [22, 29, 22, 29], [23, 30, 23, 30], [24, 31, 24, 31], [25, 32, 25, 32], [26, 33, 26, 33], [27, 34, 27, 34], [28, 35, 28, 35], [29, 36, 29, 36], [30, 37, 30, 37], [31, 38, 31, 38],
                    [0, 12, 0, 12], [1, 13, 1, 13], [2, 14, 2, 14], [3, 15, 3, 15], [4, 16, 4, 16], [5, 17, 5, 17], [6, 18, 6, 18], [7, 19, 7, 19], [8, 20, 8, 20], [9, 21, 9, 21], [10, 22, 10, 22], [11, 23, 11, 23],
                    [0, 36, 0, 36], [1, 35, 1, 35], [2, 34, 2, 34], [3, 33, 3, 33], [4, 32, 4, 32], [5, 31, 5, 31], [6, 30, 6, 30], [7, 29, 7, 29], [8, 28, 8, 28], [9, 27, 9, 27], [10, 26, 10, 26], [11, 25, 11, 25], [12, 24, 12, 24],
                    [5, 36, 5, 36], [6, 35, 6, 35], [7, 34, 7, 34], [8, 33, 8, 33], [9, 32, 9, 32], [10, 31, 10, 31], [11, 30, 11, 30], [12, 29, 12, 29], [13, 28, 13, 28], [14, 27, 14, 27], [15, 26, 15, 26], [16, 25, 16, 25], [17, 24, 17, 24],
                    [1, 37, 1, 37], [2, 38, 3, 38], [4, 39, 5, 39], [6, 40, 7, 40], [8, 41, 9, 41], [10, 42, 11, 42], [12, 43, 13, 43], [14, 44, 15, 44], [16, 45, 17, 45], [18, 46, 19, 46],
                    [25, 46, 26, 46], [27, 45, 28, 45], [29, 44, 30, 44], [31, 43, 32, 43], [33, 42, 34, 42], [35, 41, 36, 41], [37, 40, 38, 40], [39, 39, 40, 39]
                ],
                yellowBricks: [[32, 38], [33, 38], [34, 38], [35, 38]],
                redBricks: [[37, 38], [38, 38], [39, 38], [40, 38]]
                },
                'container': {rainRate: 3, grid: [
                    [0, 0, 0, 46], [47, 0, 47, 46], [0, 46, 47, 46]
                ],
                yellowBricks: [[5, 46], [6, 46], [7, 46], [22, 46], [23, 46], [24, 46], [25, 46], [40, 46], [41, 46], [42, 46]],
                redBricks: [[1, 46], [2, 46], [3, 46], [4, 46], [8, 46], [9, 46], [10, 46], [11, 46], [12, 46], [13, 46], [14, 46], [15, 46], [16, 46], [17, 46], [18, 46], [19, 46], [20, 46], [21, 46], [26, 46], [27, 46], [28, 46], [29, 46], [30, 46], [31, 46], [32, 46], [33, 46], [34, 46], [35, 46], [36, 46], [37, 46], [38, 46], [39, 46], [43, 46], [44, 46], [45, 46], [46, 46]]
                },
                'clear': {rainRate: 3, grid: [], yellowBricks: [], redBricks: []}
            };
            
            for (y = 0; y < height + 2; y++) {
                for (x = 0; x < width + 2; x++) {
                    grid[y][x].isBrick = false;
                    grid[y][x].isYellowBrick = false;
                    grid[y][x].isRedBrick = false;
                    grid[y][x].waterDensity = 0;
                    grid[y][x].waterDensityNext = 0;
                }
            }
            
            for (i = 0; i < patterns[e.target.value].grid.length; i++) {
                var rectangle = patterns[e.target.value].grid[i];
                for (x = rectangle[0]; x <= rectangle[2]; x++) {
                    for (y = rectangle[1]; y <= rectangle[3]; y++) {
                        grid[y + 1][x + 1].isBrick = true;
                    }
                }
            }
            
            for (i = 0; i < patterns[e.target.value].yellowBricks.length; i++) {
                x = patterns[e.target.value].yellowBricks[i][0];
                y = patterns[e.target.value].yellowBricks[i][1];
                grid[y + 1][x + 1].isYellowBrick = true;
            }
            for (i = 0; i < patterns[e.target.value].redBricks.length; i++) {
                x = patterns[e.target.value].redBricks[i][0];
                y = patterns[e.target.value].redBricks[i][1];
                grid[y + 1][x + 1].isRedBrick = true;
            }
            
            this.setState({grid: grid, drops: [], rainRate: patterns[e.target.value].rainRate, pattern: e.target.value, yellowBricksActive: true, redBricksActive: true});
        }
    },
    toggleYellowBricks: function() {
        var yellowBricksActive = !this.state.yellowBricksActive;
        var grid = this.state.grid;
        var x, y;
        
        for (y = 0; y < height + 2; y++) {
            for (x = 0; x < width + 2; x++) {
                if (grid[y][x].isYellowBrick) {
                    grid[y][x].isBrick = yellowBricksActive;
                }
            }
        }
        
        this.setState({grid: grid, yellowBricksActive: yellowBricksActive});
    },
    toggleRedBricks: function() {
        var redBricksActive = !this.state.redBricksActive;
        var grid = this.state.grid;
        var x, y;
        
        for (y = 0; y < height + 2; y++) {
            for (x = 0; x < width + 2; x++) {
                if (grid[y][x].isRedBrick) {
                    grid[y][x].isBrick = redBricksActive;
                }
            }
        }
        
        this.setState({grid: grid, redBricksActive: redBricksActive});
    },
    render: function() {
        var grid = JSON.parse(JSON.stringify(this.state.grid));
        var drops = this.state.drops;
        
        var i;
        
        var totalWaterMass = 0;
        var noColoredBricks = true;
        for (y = 0; y < height + 2; y++) {
            for (x = 0; x < width + 2; x++) {
                var square = grid[y][x];
                if (!(y == 0 || y == height + 1 || x == 0 || x == width + 1)) {
                    totalWaterMass += square.waterDensity;
                    if (square.isYellowBrick || square.isRedBrick) {
                        noColoredBricks = false;
                    }
                }
            }
        }
        for (i = 0; i < drops.length; i++) {
            totalWaterMass += drops[i].mass;
        }

        // Process drop portion of the water density
        for (i = 0; i < drops.length; i++) {
            var drop = drops[i];
            
            var gridItemTarget = grid[Math.floor(drop.y / 1000)][Math.floor(drop.x / 1000)];
            var gridItemDown = grid[Math.floor(drop.y / 1000) + 1][Math.floor(drop.x / 1000)];
            
            var portionDown = (drop.y % 1000) / 1000;
            gridItemTarget.waterDensity += Math.floor((1 - portionDown) * drop.mass);
            gridItemDown.waterDensity += Math.floor(portionDown * drop.mass);
        }
        
        // Render sub-components
        var tiles = [];
        for (var y = 1; y < height + 1; y++) {
            for (var x = 1; x < width + 1; x++) {
                var gridItem = grid[y][x];
                var stylesTile = {};
                if (gridItem.isBrick) {
                    if (gridItem.isYellowBrick) {
                        stylesTile.backgroundColor = '#ffff00';
                    }
                    if (gridItem.isRedBrick) {
                        stylesTile.backgroundColor = '#ff0000';
                    }
                    if (!gridItem.isYellowBrick && !gridItem.isRedBrick) {
                        stylesTile.backgroundColor = '#543807';
                    }
                } else {
                    stylesTile.backgroundColor = 'rgba(' + Math.floor(255 - gridItem.waterDensity) + ', ' + Math.floor(224 - ((gridItem.waterDensity / 255) * 224)) + ', ' + Math.floor(176 + ((gridItem.waterDensity / 255) * 79)) + ', 1)';
                }
                tiles.push(
                    <div key={x + ',' + y} className="tile" style={stylesTile} />
                );
            }
        }
        var stylesGrid = {width: width * 8, height: height * 8};
        return (
            <div className="frame">
                <div className="waterDemo" style={stylesGrid} onMouseDown={this.tileMouseDown} onMouseMove={this.tileMouseMove} onMouseUp={this.tileMouseUp}>
                    {tiles}
                </div>
                <div className="input"><div className="label">Click or drag tiles to set and clear bricks.</div></div>
                <div className={noColoredBricks ? 'input hidden' : 'input'}>
                    <label><input type="checkbox" onChange={this.toggleYellowBricks} checked={this.state.yellowBricksActive}></input> Fill yellow bricks</label>
                    <label><input type="checkbox" onChange={this.toggleRedBricks}    checked={this.state.redBricksActive}   ></input> Fill red bricks</label>
                </div>
                <div className="input">
                    <input type="button" className="button" value="&darr;" disabled={this.state.frameRate === 3}  onClick={this.frameRateDown}></input>
                    <input type="button" className="button" value="&uarr;" disabled={this.state.frameRate === 60} onClick={this.frameRateUp}  ></input>
                    <div className="label">Frame rate: {this.state.frameRate}</div>
                </div>
                <div className="input">
                    <input type="button" className="button" value="&darr;" disabled={this.state.rainRate === 0}                     onClick={this.rainRateDown}></input>
                    <input type="button" className="button" value="&uarr;" disabled={this.state.rainRate === rainLevels.length - 1} onClick={this.rainRateUp}  ></input>
                    <div className="label">Rain rate: {rainLevels[this.state.rainRate].label}</div>
                </div>
                <div className="input">
                    <div className="label">Select preset playfield: </div>
                    <select onChange={this.applyPattern} value={this.state.pattern}>
                        <option value="custom">Custom</option>
                        <option value="buckets">Buckets</option>
                        <option value="pachinko">Pachinko</option>
                        <option value="pipes">Pipes</option>
                        <option value="slopes">Slopes</option>
                        <option value="spillover">Spillover</option>
                        <option value="container">Container</option>
                        <option value="clear">Clear</option>
                    </select>
                </div>
                <div className="input">
                    <div className="label">Total water mass: {(totalWaterMass < 10 ? (totalWaterMass < 1 ? totalWaterMass : totalWaterMass.toFixed(1)) : totalWaterMass.toFixed(0))}</div>
                </div>
            </div>
        );
    }
});

ReactDOM.render(
    <WaterDemo />,
    document.getElementById('content')
);
