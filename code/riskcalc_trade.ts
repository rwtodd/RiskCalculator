
export class Instrument {
    readonly TickSize: number;
    readonly TickValue: number;
    readonly TickSizeDigits: number;

    constructor(sz: number, v: number) {
        this.TickSize = sz;
        this.TickValue = v;

        let tmpDigits = 0;
        let tmp = sz;
        while (tmp - Math.trunc(tmp) > 0.000001) {
            tmp = tmp * 10;
            tmpDigits = tmpDigits + 1;
        }
        this.TickSizeDigits = tmpDigits;
    }

    moneyDiff(p1: number, p2: number): number {
        return (p1 - p2) / this.TickSize * this.TickValue;
    }

    round(price: number, longShort: number) {
        let scaled = price / this.TickSize;
        let scRound = Math.round(scaled);
        if (Math.abs(scaled - scRound) > (this.TickSize / 16)) {
            scRound = (longShort > 0) ? Math.ceil(scaled) : Math.floor(scaled);
        }
        return scRound * this.TickSize;
    }
}

// here's the list of pre-generated instruments
export var KnownInstruments: { [k: string]: Instrument } = {
    ES: new Instrument(0.25, 12.50),
    E6: new Instrument(5, 6.25),
    CL: new Instrument(0.01, 10.00),
    Stocks: new Instrument(0.01, 0.01)
}

// records stats about a trade, based on User Inputs
export class Trade {
    readonly inst: Instrument;    // the instrument we are using
    readonly tdir: number;        // 1 = long, -1 = short

    entrySum: number;
    entryContracts: number;
    exitSum: number;
    exitContracts: number;
    stopSum: number;
    stopContracts: number;

    constructor(i: Instrument, tdir: number) {
        this.inst = i;
        this.entrySum = 0;
        this.exitSum = 0;
        this.stopSum = 0;
        this.entryContracts = 0;
        this.exitContracts = 0;
        this.stopContracts = 0;
        this.tdir = tdir;
    }

    // record transactions...
    addEntry(price: number, conts: number) {
        this.entrySum += (price * conts);
        this.entryContracts += conts;
    }
    addExit(price: number, conts: number) {
        this.exitSum += (price * conts);
        this.exitContracts += conts;
    }
    addStop(price: number, conts: number) {
        this.stopSum += (price * conts);
        this.stopContracts += conts;
    }

    // -------------------------------------------
    // derived properties...
    // -------------------------------------------
    get avgEntry(): number {
        return this.entrySum / this.entryContracts;
    }

    get worstExit(): number {
        return (this.exitSum + this.stopSum) /
            (this.exitContracts + this.stopContracts);
    }

    get numContracts(): number {
        return Math.max(this.entryContracts, (this.exitContracts + this.stopContracts));
    }

    get entryExitRisk(): number {
        return this.tdir * this.numContracts * (this.inst.moneyDiff(this.avgEntry, this.worstExit));
    }

    get remainingOpenContracts(): number {
        return this.entryContracts - this.exitContracts;
    }
}
