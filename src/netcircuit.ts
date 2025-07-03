/**
 * Circuit Builder - TypeScript Implementation
 * A comprehensive electrical circuit modeling and visualization system
 */

// Enums and Interfaces
export enum PinType {
    INPUT = 'input',
    OUTPUT = 'output',
    POWER = 'power',
    GROUND = 'ground',
    NULL = 'null'
}

export interface Point {
    x: number;
    y: number;
}

export interface Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface GridNode {
    point: Point;
    gScore: number;
    fScore: number;
    parent: Point | null;
}

// Pin Class
export class Pin {
    private _x: number = 0;
    private _y: number = 0;
    private _type: PinType = PinType.NULL;
    private _component: Component | null = null;
    
    public convergenceCount: number = 0;  // renamed from conv
    public divergenceCount: number = 0;   // renamed from div

    constructor(private readonly _name: string) {}

    // Getters
    get name(): string {
        return this._name;
    }

    get x(): number {
        return this._x;
    }

    get y(): number {
        return this._y;
    }

    get type(): PinType {
        return this._type;
    }

    get component(): Component | null {
        return this._component;
    }

    // Setters with validation
    set x(value: number) {
        if (!Number.isFinite(value)) {
            throw new Error(`Invalid x coordinate: ${value}`);
        }
        this._x = value;
    }

    set y(value: number) {
        if (!Number.isFinite(value)) {
            throw new Error(`Invalid y coordinate: ${value}`);
        }
        this._y = value;
    }

    set type(value: PinType) {
        this._type = value;
    }

    set component(value: Component | null) {
        this._component = value;
    }

    // Methods
    getPosition(): Point {
        return { x: this._x, y: this._y };
    }

    setPosition(point: Point): void {
        this.x = point.x;
        this.y = point.y;
    }
}

// Wire Class with Smart Routing
export class Wire {
    private _bendPoints: Point[] = [];
    private _routedPath: Point[] = [];

    constructor(
        private readonly _enterPin: Pin,
        private readonly _exitPin: Pin,
        private readonly _name: string,
        bendPoints: Point[] = []
    ) {
        if (!_enterPin || !_exitPin) {
            throw new Error('Both enter and exit pins must be provided');
        }
        
        this._bendPoints = [...bendPoints];
        _enterPin.divergenceCount++;
        _exitPin.convergenceCount++;
    }

    // Getters
    get enterPin(): Pin {
        return this._enterPin;
    }

    get exitPin(): Pin {
        return this._exitPin;
    }

    get name(): string {
        return this._name;
    }

    get bendPoints(): readonly Point[] {
        return this._bendPoints;
    }

    get routedPath(): readonly Point[] {
        return this._routedPath;
    }

    // Methods
    addBendPoint(point: Point): void {
        this._bendPoints.push({ ...point });
    }

    clearBendPoints(): void {
        this._bendPoints = [];
    }

    /**
     * Calculate optimal path avoiding obstacles using A* algorithm
     */
    calculatePath(obstacles: Rectangle[], existingWires: Wire[], gridSize: number = 10): Point[] {
        const start = this._enterPin.getPosition();
        const end = this._exitPin.getPosition();

        // Use manual bend points if specified
        if (this._bendPoints.length > 0) {
            this._routedPath = [start, ...this._bendPoints, end];
            return [...this._routedPath];
        }

        // Create obstacle grid
        const grid = this.createObstacleGrid(obstacles, existingWires, gridSize, start, end);
        
        // Find path using A*
        const path = this.findPathAStar(grid, start, end, gridSize);
        
        if (path.length > 0) {
            this._routedPath = this.optimizePath(path);
        } else {
            // Fallback to L-shaped path
            this._routedPath = this.createLShapedPath(start, end, obstacles);
        }

        return [...this._routedPath];
    }

    private createObstacleGrid(
        obstacles: Rectangle[], 
        existingWires: Wire[], 
        gridSize: number, 
        start: Point, 
        end: Point
    ): boolean[][] {
       const bounds = this.calculateGridBounds(obstacles, start, end);
        const gridWidth = Math.ceil(bounds.width / gridSize);
        const gridHeight = Math.ceil(bounds.height / gridSize);
        
        // Initialize grid as all passable
        const grid: boolean[][] = Array(gridHeight)
            .fill(null)
            .map(() => Array(gridWidth).fill(true));

        // Mark obstacles
        obstacles.forEach(obstacle => {
            this.markRectangleInGrid(grid, obstacle, gridSize, bounds.minX, bounds.minY);
        });

        // Mark existing wire paths
        existingWires
            .filter(wire => wire !== this && wire.routedPath.length > 0)
            .forEach(wire => {
                this.markWirePathInGrid(grid, wire.routedPath, gridSize, bounds.minX, bounds.minY);
            });

        return grid;
    }

    private calculateGridBounds(obstacles: Rectangle[], start: Point, end: Point): {
    minX: number;
    minY: number;
    width: number;
    height: number;
} {
    // Include start/end points in bounds calculation
    const allX = [start.x, end.x, ...obstacles.flatMap(o => [o.x, o.x + o.width])];
    const allY = [start.y, end.y, ...obstacles.flatMap(o => [o.y, o.y + o.height])];
    
    const minX = Math.min(...allX) - 50;
    const minY = Math.min(...allY) - 50;
    const maxX = Math.max(...allX) + 50;
    const maxY = Math.max(...allY) + 50;
    
    return {
        minX,
        minY,
        width: maxX - minX,
        height: maxY - minY
    };
}

    private markRectangleInGrid(
    grid: boolean[][], 
    rect: Rectangle, 
    gridSize: number, 
    offsetX: number, 
    offsetY: number
): void {
    const startX = Math.floor((rect.x - offsetX) / gridSize);
    const startY = Math.floor((rect.y - offsetY) / gridSize);
    const endX = Math.ceil((rect.x + rect.width - offsetX) / gridSize);
    const endY = Math.ceil((rect.y + rect.height - offsetY) / gridSize);

    for (let y = Math.max(0, startY); y < Math.min(grid.length, endY); y++) {
        for (let x = Math.max(0, startX); x < Math.min(grid[0].length, endX); x++) {
            grid[y][x] = false;
        }
    }
}

    private markWirePathInGrid(
        grid: boolean[][], 
        path: readonly Point[], 
        gridSize: number, 
        offsetX: number, 
        offsetY: number
    ): void {
        const tolerance = 2; // Grid cells around wire to mark as blocked
        
        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i];
            const p2 = path[i + 1];
            
            const steps = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
            
            for (let step = 0; step <= steps; step++) {
                const t = steps === 0 ? 0 : step / steps;
                const x = p1.x + (p2.x - p1.x) * t;
                const y = p1.y + (p2.y - p1.y) * t;
                
                const gridX = Math.floor((x - offsetX) / gridSize);
                const gridY = Math.floor((y - offsetY) / gridSize);
                
                // Mark area around wire as blocked
                for (let dy = -tolerance; dy <= tolerance; dy++) {
                    for (let dx = -tolerance; dx <= tolerance; dx++) {
                        const gx = gridX + dx;
                        const gy = gridY + dy;
                        
                        if (gx >= 0 && gy >= 0 && gy < grid.length && gx < grid[0].length) {
                            grid[gy][gx] = false;
                        }
                    }
                }
            }
        }
    }

    private findPathAStar(grid: boolean[][], start: Point, end: Point, gridSize: number): Point[] {
        const gridStart = { 
            x: Math.floor(start.x / gridSize), 
            y: Math.floor(start.y / gridSize) 
        };
        const gridEnd = { 
            x: Math.floor(end.x / gridSize), 
            y: Math.floor(end.y / gridSize) 
        };
        
        const openSet: GridNode[] = [];
        const closedSet = new Set<string>();
        const gScores = new Map<string, number>();
        const parents = new Map<string, Point | null>();

        const pointKey = (p: Point): string => `${p.x},${p.y}`;
        const heuristic = (a: Point, b: Point): number => 
            Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

        // Initialize start node
        const startNode: GridNode = {
            point: gridStart,
            gScore: 0,
            fScore: heuristic(gridStart, gridEnd),
            parent: null
        };

        openSet.push(startNode);
        gScores.set(pointKey(gridStart), 0);
        parents.set(pointKey(gridStart), null);

        while (openSet.length > 0) {
            // Get node with lowest fScore
            openSet.sort((a, b) => a.fScore - b.fScore);
            const current = openSet.shift()!;
            
            // Check if we reached the goal
            if (current.point.x === gridEnd.x && current.point.y === gridEnd.y) {
                return this.reconstructPath(parents, current.point, gridSize);
            }

            closedSet.add(pointKey(current.point));

            // Check all neighbors
            const neighbors = [
                { x: current.point.x - 1, y: current.point.y },
                { x: current.point.x + 1, y: current.point.y },
                { x: current.point.x, y: current.point.y - 1 },
                { x: current.point.x, y: current.point.y + 1 }
            ];

            for (const neighbor of neighbors) {
                const neighborKey = pointKey(neighbor);
                
                // Skip if already processed or invalid
                if (closedSet.has(neighborKey) ||
                    neighbor.x < 0 || neighbor.y < 0 ||
                    neighbor.y >= grid.length || neighbor.x >= grid[0].length ||
                    !grid[neighbor.y][neighbor.x]) {
                    continue;
                }

                const tentativeGScore = current.gScore + 1;
                
                if (!gScores.has(neighborKey) || tentativeGScore < gScores.get(neighborKey)!) {
                    parents.set(neighborKey, current.point);
                    gScores.set(neighborKey, tentativeGScore);
                    
                    const fScore = tentativeGScore + heuristic(neighbor, gridEnd);
                    
                    // Add to open set if not already there
                    if (!openSet.some(node => pointKey(node.point) === neighborKey)) {
                        openSet.push({
                            point: neighbor,
                            gScore: tentativeGScore,
                            fScore: fScore,
                            parent: current.point
                        });
                    }
                }
            }
        }

        return []; // No path found
    }

    private reconstructPath(parents: Map<string, Point | null>, endPoint: Point, gridSize: number): Point[] {
        const path: Point[] = [];
        let currentPoint: Point | null = endPoint;
        
        while (currentPoint !== null) {
            path.unshift({
                x: currentPoint.x * gridSize,
                y: currentPoint.y * gridSize
            });
            currentPoint = parents.get(`${currentPoint.x},${currentPoint.y}`) || null;
        }
        
        return path;
    }

    private createLShapedPath(start: Point, end: Point, obstacles: Rectangle[]): Point[] {
        // Try horizontal-first L-shape
        const midPoint1 = { x: end.x, y: start.y };
        if (this.isLineClear(start, midPoint1, obstacles) && 
            this.isLineClear(midPoint1, end, obstacles)) {
            return [start, midPoint1, end];
        }
        
        // Try vertical-first L-shape
        const midPoint2 = { x: start.x, y: end.y };
        if (this.isLineClear(start, midPoint2, obstacles) && 
            this.isLineClear(midPoint2, end, obstacles)) {
            return [start, midPoint2, end];
        }
        
        // Fallback to direct line
        return [start, end];
    }

    private isLineClear(start: Point, end: Point, obstacles: Rectangle[]): boolean {
        const steps = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y));
        
        for (let i = 0; i <= steps; i++) {
            const t = steps === 0 ? 0 : i / steps;
            const point = {
                x: start.x + (end.x - start.x) * t,
                y: start.y + (end.y - start.y) * t
            };
            
            if (obstacles.some(obstacle => this.pointInRectangle(point, obstacle))) {
                return false;
            }
        }
        
        return true;
    }

    private pointInRectangle(point: Point, rect: Rectangle): boolean {
        return point.x >= rect.x && 
               point.x <= rect.x + rect.width &&
               point.y >= rect.y && 
               point.y <= rect.y + rect.height;
    }

    private optimizePath(path: Point[]): Point[] {
    if (path.length <= 2) return [...path];
    
    const optimized = [path[0]];
    let current = 0;
    
    while (current < path.length - 1) {
        let farthest = current + 1;
        
        // Find the farthest point we can reach in a straight line
        while (farthest < path.length - 1) {
            if (!this.arePointsCollinear(path[current], path[farthest], path[farthest + 1])) {
                break;
            }
            farthest++;
        }
        
        optimized.push(path[farthest]);
        current = farthest;
    }
    
    return optimized;
}

private arePointsCollinear(p1: Point, p2: Point, p3: Point): boolean {
    const area = Math.abs(
        (p2.x - p1.x) * (p3.y - p1.y) - 
        (p3.x - p1.x) * (p2.y - p1.y)
    );
    return area < 1e-5; // Tolerance for floating point errors
}
}

// Component Class
export class Component {
    protected _inputPins: Pin[] = [];
    protected _outputPins: Pin[] = [];
    protected _groundPins: Pin[] = [];
    protected _powerPins: Pin[] = [];
    protected _name: string;
    protected _x: number;
    protected _y: number;
    protected _width: number;
    protected _height: number;

    constructor(
        inputPins: Pin[],
        outputPins: Pin[],
        groundPins: Pin[],
        powerPins: Pin[],
        name: string,
        x: number = 0,
        y: number = 0,
        width: number = 60,
        height: number = 40
    ) {
        this._inputPins = [...inputPins];
        this._outputPins = [...outputPins];
        this._groundPins = [...groundPins];
        this._powerPins = [...powerPins];
        this._name = name;
        this._x = x;
        this._y = y;
        this._width = Math.max(width, 20);
        this._height = Math.max(height, 20);
        
        this.initializePins();
    }

    // Getters
    get inputPins(): readonly Pin[] { return this._inputPins; }
    get outputPins(): readonly Pin[] { return this._outputPins; }
    get groundPins(): readonly Pin[] { return this._groundPins; }
    get powerPins(): readonly Pin[] { return this._powerPins; }
    get name(): string { return this._name; }
    get x(): number { return this._x; }
    get y(): number { return this._y; }
    get width(): number { return this._width; }
    get height(): number { return this._height; }

    // Setters with validation
    set x(value: number) {
        if (!Number.isFinite(value)) {
            throw new Error(`Invalid x coordinate: ${value}`);
        }
        this._x = value;
        this.updatePinPositions();
    }

    set y(value: number) {
        if (!Number.isFinite(value)) {
            throw new Error(`Invalid y coordinate: ${value}`);
        }
        this._y = value;
        this.updatePinPositions();
    }

    set width(value: number) {
        if (!Number.isFinite(value) || value <= 0) {
            throw new Error(`Invalid width: ${value}`);
        }
        this._width = value;
        this.updatePinPositions();
    }

    set height(value: number) {
        if (!Number.isFinite(value) || value <= 0) {
            throw new Error(`Invalid height: ${value}`);
        }
        this._height = value;
        this.updatePinPositions();
    }

    // Methods
    getBoundingBox(): Rectangle {
        return {
            x: this._x,
            y: this._y,
            width: this._width,
            height: this._height
        };
    }

    getAllPins(): Pin[] {
        return [
            ...this._inputPins,
            ...this._outputPins,
            ...this._groundPins,
            ...this._powerPins
        ];
    }

    setPosition(x: number, y: number): void {
        this._x = x;
        this._y = y;
        this.updatePinPositions();
    }

    setSize(width: number, height: number): void {
        if (width <= 0 || height <= 0) {
            throw new Error('Width and height must be positive');
        }
        this._width = width;
        this._height = height;
        this.updatePinPositions();
    }

    private initializePins(): void {
        // Set pin types and parent references
        this._inputPins.forEach(pin => {
            pin.type = PinType.INPUT;
            pin.component = this;
        });
        
        this._outputPins.forEach(pin => {
            pin.type = PinType.OUTPUT;
            pin.component = this;
        });
        
        this._powerPins.forEach(pin => {
            pin.type = PinType.POWER;
            pin.component = this;
        });
        
        this._groundPins.forEach(pin => {
            pin.type = PinType.GROUND;
            pin.component = this;
        });

        this.updatePinPositions();
    }

    private updatePinPositions(): void {
        // Position input pins on left side
        this._inputPins.forEach((pin, index) => {
            pin.x = this._x;
            pin.y = this._y + (this._height * (index + 1)) / (this._inputPins.length + 1);
        });

        // Position output pins on right side
        this._outputPins.forEach((pin, index) => {
            pin.x = this._x + this._width;
            pin.y = this._y + (this._height * (index + 1)) / (this._outputPins.length + 1);
        });

        // Position power pins on top
        this._powerPins.forEach((pin, index) => {
            pin.x = this._x + (this._width * (index + 1)) / (this._powerPins.length + 1);
            pin.y = this._y;
        });

        // Position ground pins on bottom
        this._groundPins.forEach((pin, index) => {
            pin.x = this._x + (this._width * (index + 1)) / (this._groundPins.length + 1);
            pin.y = this._y + this._height;
        });
    }
}

// Specialized Component Classes
export class Resistor extends Component {
    constructor(
        inputPins: Pin[],
        outputPins: Pin[],
        groundPins: Pin[],
        powerPins: Pin[],
        name: string,
        x: number,
        y: number,
        width: number,
        height: number,
        private readonly _resistance: number
    ) {
        super(inputPins, outputPins, groundPins, powerPins, name, x, y, width, height);
        
        if (!Number.isFinite(_resistance) || _resistance <= 0) {
            throw new Error(`Invalid resistance value: ${_resistance}`);
        }
    }

    get resistance(): number {
        return this._resistance;
    }
}

// Circuit Class
export class Circuit {
    private _components: Component[] = [];
    private _wires: Wire[] = [];

    constructor(
        components: Component[],
        wires: Wire[],
        private readonly _name: string
    ) {
        if (!_name?.trim()) {
            throw new Error('Circuit name cannot be empty');
        }
        
        this._components = [...components];
        this._wires = [...wires];
    }

    // Getters
    get components(): readonly Component[] { return this._components; }
    get wires(): readonly Wire[] { return this._wires; }
    get name(): string { return this._name; }

    // Methods
    addComponent(component: Component): void {
        if (!component) {
            throw new Error('Component cannot be null');
        }
        this._components.push(component);
    }

    removeComponent(component: Component): boolean {
        const index = this._components.indexOf(component);
        if (index >= 0) {
            this._components.splice(index, 1);
            return true;
        }
        return false;
    }

    addWire(wire: Wire): void {
        if (!wire) {
            throw new Error('Wire cannot be null');
        }
        this._wires.push(wire);
    }

    removeWire(wire: Wire): boolean {
        const index = this._wires.indexOf(wire);
        if (index >= 0) {
            this._wires.splice(index, 1);
            return true;
        }
        return false;
    }

    validateConnections(): string[] {
        const errors: string[] = [];
        const allPins = this._components.flatMap(comp => comp.getAllPins());

        this._wires.forEach((wire, index) => {
            if (!allPins.includes(wire.enterPin)) {
                errors.push(`Wire ${index} (${wire.name}): Enter pin not found in circuit`);
            }
            if (!allPins.includes(wire.exitPin)) {
                errors.push(`Wire ${index} (${wire.name}): Exit pin not found in circuit`);
            }
        });

        return errors;
    }
}

// Circuit Builder and Renderer
export interface CircuitRenderOptions {
    canvasWidth: number;
    canvasHeight: number;
    backgroundColor: string;
    componentColor: string;
    wireColor: string;
    pinColors: Record<PinType, string>;
    fontSize: number;
    lineWidth: number;
    gridSize: number;
}

const DEFAULT_RENDER_OPTIONS: CircuitRenderOptions = {
    canvasWidth: 800,
    canvasHeight: 600,
    backgroundColor: '#ffffff',
    componentColor: '#000000',
    wireColor: '#0066cc',
    pinColors: {
        [PinType.INPUT]: '#0066ff',
        [PinType.OUTPUT]: '#ff3300',
        [PinType.POWER]: '#ff8800',
        [PinType.GROUND]: '#00aa00',
        [PinType.NULL]: '#888888'
    },
    fontSize: 12,
    lineWidth: 2,
    gridSize: 10
};

export function buildCircuit(
    circuit: Circuit, 
    container: HTMLElement, 
    options: Partial<CircuitRenderOptions> = {}
): boolean {
    if (!circuit || !container) {
        console.error('Circuit and container are required');
        return false;
    }

    const opts = { ...DEFAULT_RENDER_OPTIONS, ...options };
    
    try {
        // Validate circuit connections
        const errors = circuit.validateConnections();
        if (errors.length > 0) {
            console.warn('Circuit validation warnings:', errors);
        }

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.id = `${circuit.name}-circuit-canvas`;
        canvas.width = opts.canvasWidth;
        canvas.height = opts.canvasHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get 2D context from canvas');
        }

        // Clear and setup canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = opts.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Calculate wire paths
        const obstacles = circuit.components.map(comp => comp.getBoundingBox());
        const routedWires: Wire[] = [];
        
        circuit.wires.forEach(wire => {
            wire.calculatePath(obstacles, routedWires, opts.gridSize);
            routedWires.push(wire);
        });

        // Draw components
        drawComponents(ctx, circuit.components, opts);
        
        // Draw wires
        drawWires(ctx, circuit.wires, opts);
        
        // Add canvas to container
        container.innerHTML = ''; // Clear existing content
        container.appendChild(canvas);
        
        return true;
        
    } catch (error) {
        console.error('Failed to build circuit:', error);
        return false;
    }
}

function drawComponents(
    ctx: CanvasRenderingContext2D, 
    components: readonly Component[], 
    options: CircuitRenderOptions
): void {
    ctx.strokeStyle = options.componentColor;
    ctx.fillStyle = options.backgroundColor;
    ctx.lineWidth = options.lineWidth;
    ctx.font = `${options.fontSize}px Arial`;

    components.forEach(component => {
        const bounds = component.getBoundingBox();
        
        // Draw component rectangle
        ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        
        // Draw component name
        ctx.fillStyle = options.componentColor;
        const textMetrics = ctx.measureText(component.name);
        const textX = bounds.x + (bounds.width - textMetrics.width) / 2;
        const textY = bounds.y + bounds.height / 2 + options.fontSize / 3;
        ctx.fillText(component.name, textX, textY);
        
        // Draw pins
        component.getAllPins().forEach(pin => {
            ctx.beginPath();
            ctx.arc(pin.x, pin.y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = options.pinColors[pin.type];
            ctx.fill();
            ctx.strokeStyle = options.componentColor;
            ctx.stroke();
        });
    });
}

function drawWires(
    ctx: CanvasRenderingContext2D, 
    wires: readonly Wire[], 
    options: CircuitRenderOptions
): void {
    ctx.strokeStyle = options.wireColor;
    ctx.lineWidth = options.lineWidth;
    ctx.font = `${Math.max(10, options.fontSize - 2)}px Arial`;

    wires.forEach(wire => {
        const path = wire.routedPath;
        if (path.length < 2) return;

        // Draw wire path
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
        
        ctx.stroke();

        // Draw wire label
        if (path.length >= 2) {
            const midIndex = Math.floor(path.length / 2);
            const labelPoint = path[midIndex];
            
            ctx.fillStyle = options.wireColor;
            ctx.fillText(wire.name, labelPoint.x + 5, labelPoint.y - 5);
        }

        // Draw junction dots at bend points (optional)
        if (path.length > 2) {
            ctx.fillStyle = options.wireColor;
            path.slice(1, -1).forEach(point => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
                ctx.fill();
            });
        }
    });
}