/**
 * A object model of electrical pins
 * @private x {getx(),setx()}
 * @private y {gety(),sety()}
 * @private name {who()}
 * @public conv, div
 */
/**
 * @abstract pt - pintype
 */
var pt;
(function (pt) {
    pt[pt["input"] = 0] = "input";
    pt[pt["output"] = 1] = "output";
    pt[pt["power"] = 2] = "power";
    pt[pt["ground"] = 3] = "ground";
    pt[pt["ptnull"] = 4] = "ptnull";
})(pt || (pt = {}));
export class Pin {
    constructor(name) {
        this.name = name;
        this.x = 0;
        this.y = 0;
        this.conv = 0;
        this.div = 0;
        this.type = pt.ptnull;
        this.component = new Component([], [], [], [], "", 0, 0, 0, 0);
    }
    get who() {
        return this.name;
    }
    get getx() {
        return this.x;
    }
    get gety() {
        return this.y;
    }
    set setx(val) {
        if (typeof val !== 'number' || isNaN(val)) {
            throw new Error('Invalid x coordinate');
        }
        this.x = val;
    }
    set sety(val) {
        if (typeof val !== 'number' || isNaN(val)) {
            throw new Error('Invalid y coordinate');
        }
        this.y = val;
    }
    get parent() {
        return this.component;
    }
    set append_to(component) {
        this.component = component;
    }
    /**
     * typeof
     */
    get typeof() {
        return this.type;
    }
    set typesetter(type) {
        this.type = type;
    }
}
/**
 * @description class to model electrical wires
 */
export class Wire {
    constructor(enterPin, exitPin, name, bendPoints = []) {
        if (!enterPin || !exitPin) {
            throw new Error('Both pins must be provided');
        }
        this.name = name;
        this.enterPin = enterPin;
        this.exitPin = exitPin;
        this.bendPoints = bendPoints;
        enterPin.div++;
        exitPin.conv++;
    }
    get entry() {
        return this.enterPin;
    }
    get exit() {
        return this.exitPin;
    }
    get who() {
        return this.name;
    }
    get bends() {
        return this.bendPoints;
    }
    addBendPoint(x, y) {
        this.bendPoints.push({ x, y });
    }
    calculateAutoBend() {
        // Simple automatic 90-degree bend logic
        const start = this.enterPin;
        const end = this.exitPin;
        if (Math.abs(start.getx - end.getx) > 50 && Math.abs(start.gety - end.gety) > 50) {
            // If significant difference in both axes, add a bend point
            this.bendPoints = [{ x: start.getx, y: end.gety }];
        }
        else {
            this.bendPoints = [];
        }
    }
}
export class Component {
    constructor(i, o, g, p, name, k = 0, h = 0, height = 0, width = 0) {
        this.inputPins = i;
        this.outputPins = o;
        this.groundPins = g;
        this.powerPins = p;
        this.name = name;
        this.k = k;
        this.h = h;
        this.height = height;
        this.width = width;
        this.__pin_init__();
    }
    get inputs() {
        return this.inputPins;
    }
    get outputs() {
        return this.outputPins;
    }
    get grounds() {
        return this.groundPins;
    }
    get powers() {
        return this.powerPins;
    }
    get who() {
        return this.name;
    }
    get getK() {
        return this.k;
    }
    set setK(val) {
        if (typeof val !== 'number' || isNaN(val)) {
            throw new Error('Invalid k coordinate');
        }
        this.k = val;
    }
    get getH() {
        return this.h;
    }
    set setH(val) {
        if (typeof val !== 'number' || isNaN(val)) {
            throw new Error('Invalid h coordinate');
        }
        this.h = val;
    }
    get getHeight() {
        return this.height;
    }
    set setHeight(val) {
        if (typeof val !== 'number' || isNaN(val) || val < 0) {
            throw new Error('Invalid height');
        }
        this.height = val;
    }
    get getWidth() {
        return this.width;
    }
    set setWidth(val) {
        if (typeof val !== 'number' || isNaN(val) || val < 0) {
            throw new Error('Invalid width');
        }
        this.width = val;
    }
    __pin_init__() {
        this.inputPins.forEach(pins => {
            pins.typesetter = pt.input;
            pins.append_to = this;
        });
        this.outputPins.forEach(pins => {
            pins.typesetter = pt.output;
            pins.append_to = this;
        });
        this.powerPins.forEach(pins => {
            pins.typesetter = pt.power;
            pins.append_to = this;
        });
        this.groundPins.forEach(pins => {
            pins.typesetter = pt.ground;
            pins.append_to = this;
        });
    }
}
/**
 *
 * _r()_ returns the value for the resistor
 *
 */
export class Resistor extends Component {
    constructor(i, o, g, p, name, h, k, width, height, r) {
        super(i, o, g, p, name, h, k, width, height);
        if (typeof r !== 'number' || isNaN(r) || r <= 0) {
            throw new Error('Invalid resistance value');
        }
        this.Resistance = r;
    }
    get r() {
        return this.Resistance;
    }
}
/**
 * @abstract A circuit is a grouping of a set of wires and components
 */
export class Circuit {
    constructor(c, w, n) {
        if (!c || !w || !n) {
            throw new Error('Invalid circuit parameters');
        }
        this.components = c;
        this.wires = w;
        this.name = n;
    }
    get getComponents() {
        return this.components;
    }
    set setComponents(components) {
        if (!components) {
            throw new Error('Invalid components array');
        }
        this.components = components;
    }
    get getWires() {
        return this.wires;
    }
    set setWires(wires) {
        if (!wires) {
            throw new Error('Invalid wires array');
        }
        this.wires = wires;
    }
    get getName() {
        return this.name;
    }
    set setName(name) {
        if (!name) {
            throw new Error('Invalid name');
        }
        this.name = name;
    }
    addWire(wire) {
        if (!wire) {
            throw new Error('Invalid wire');
        }
        this.wires.push(wire);
    }
    addComponent(component) {
        if (!component) {
            throw new Error('Invalid component');
        }
        this.components.push(component);
    }
}
/**
 * @abstract builds a circuit object into a canvas, returns 0 if successful
 */
export function CircuitBuilder(circuit, client) {
    if (!circuit || !client) {
        return -1;
    }
    const canvas = document.createElement('canvas');
    canvas.id = circuit.getName + '-netcircuit';
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return -1;
    }
    try {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Set default styles
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.font = '12px Arial';
        // Get all pins for validation
        const allPins = [];
        circuit.getComponents.forEach(component => {
            allPins.push(...component.inputs, ...component.outputs, ...component.grounds, ...component.powers);
        });
        // Validate all wires
        circuit.getWires.forEach(wire => {
            if (!allPins.includes(wire.entry) || !allPins.includes(wire.exit)) {
                throw new Error(`Wire ${wire.who} connects to non-existent pins`);
            }
            // Calculate automatic bends if none specified
            if (wire.bends.length === 0) {
                wire.calculateAutoBend();
            }
        });
        // Draw components
        circuit.getComponents.forEach(component => {
            const x = component.getK;
            const y = component.getH;
            const width = component.getWidth || 60;
            const height = component.getHeight || 40;
            // Draw component rectangle
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, y, width, height);
            ctx.strokeRect(x, y, width, height);
            // Draw component name
            ctx.fillStyle = '#000000';
            const textWidth = ctx.measureText(component.who.toString()).width;
            ctx.fillText(component.who.toString(), x + (width - textWidth) / 2, y + height / 2 + 4);
            component.inputs.forEach(pin => {
                pin.setx = x;
                pin.sety = y + height / (component.inputs.length + 1);
            });
            component.outputs.forEach(pin => {
                pin.setx = x + width;
                pin.sety = y + height / (component.inputs.length + 1);
            });
            // Draw pins
            const allPins = [
                ...component.inputs,
                ...component.outputs,
                ...component.grounds,
                ...component.powers
            ];
            allPins.forEach(pin => {
                ctx.beginPath();
                ctx.arc(pin.getx, pin.gety, 3, 0, 2 * Math.PI);
                ctx.fillStyle = '#ff0000';
                ctx.fill();
                ctx.stroke();
            });
        });
        // Draw wires with bends
        ctx.strokeStyle = '#0000ff';
        ctx.lineWidth = 2;
        circuit.getWires.forEach(wire => {
            ctx.beginPath();
            ctx.moveTo(wire.entry.getx, wire.entry.gety);
            if (circuit.getComponents.indexOf(wire.entry.parent) >= circuit.getComponents.indexOf(wire.exit.parent)) {
                console.log("yippiee");
                console.log(wire.exit.parent.who);
                ctx.lineTo(wire.entry.getx - 10, wire.entry.gety);
                ctx.lineTo(wire.entry.getx - 10, wire.entry.gety + wire.entry.parent.getHeight);
                ctx.lineTo(wire.exit.getx + 10, wire.entry.gety + wire.entry.parent.getHeight);
                ctx.lineTo(wire.exit.getx + 10, wire.entry.gety);
                ctx.lineTo(wire.exit.getx, wire.exit.gety);
            }
            else {
                console.log("ycky");
            }
            ctx.stroke();
            // Draw bend points
            ctx.fillStyle = '#00ff00';
            wire.bends.forEach(bend => {
                ctx.beginPath();
                ctx.arc(bend.x, bend.y, 3, 0, 2 * Math.PI);
                ctx.fill();
            });
        });
        client.appendChild(canvas);
        return 0;
    }
    catch (error) {
        console.error('CircuitBuilder failed:', error);
        if (canvas && canvas.parentNode === client) {
            client.removeChild(canvas);
        }
        return -1;
    }
}
