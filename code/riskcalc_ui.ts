import * as rc from './riskcalc_trade.js'

// initializes known instruments...
export function initInstruments() {
    let presets = document.getElementById('knownInst') as HTMLSelectElement;
    for (let known in rc.KnownInstruments) {
        let nopt = document.createElement('option');
        nopt.text = known;
        presets.add(nopt);
    }
}

// put the tick size and tick value automatically from the drop-down
export function fillOutInstrument() {
    let tsz = document.getElementById('tickSize') as HTMLInputElement;
    let tvl = document.getElementById('tickValue') as HTMLInputElement;
    let ki = document.getElementById('knownInst') as HTMLSelectElement;
    let results = rc.KnownInstruments[ki.value];
    tsz.value = results.TickSize.toString();
    tvl.value = results.TickValue.toString();
}

// adds a transaction to the TransactionTable ... 
export function addTransaction(type: number) {
    const sel = document.createElement('select');

    const putOption = function (sel: HTMLSelectElement, nm: string) {
        let theOpt = document.createElement("option");
        theOpt.text = nm;
        sel.add(theOpt);
    }

    const putInput = function (el: HTMLTableDataCellElement) {
        let ip = document.createElement('input');
        ip.type = 'number';
        ip.addEventListener('change', evt => { 
            if(sel.selectedIndex == 0) evt.stopPropagation();
        })
        el.appendChild(ip);
    }

    let tt = (document.getElementById('transTbl') as HTMLTableElement).tBodies[0];
    let row = tt.insertRow();
    let cell1 = row.insertCell();
    let cell2 = row.insertCell();
    let cell3 = row.insertCell();

    putOption(sel, "None");
    putOption(sel, "Entry");
    putOption(sel, "Stop");
    putOption(sel, "Exit");
    sel.selectedIndex = type;
    cell1.appendChild(sel);

    putInput(cell2);
    putInput(cell3);
}

// pull the current max risk into the trade parameters
export function acceptRisk() {
    let amt = parseFloat((document.getElementById('entryExitRisk') as HTMLSpanElement).innerText);
    (document.getElementById('tradeRisk') as HTMLInputElement).value = amt.toString();
    reCalc();
}

// pull trade data into a rc.Trade
function collectData(tl: rc.Trade) {
    let rows = (document.getElementById('transTbl') as HTMLTableElement).tBodies[0].rows;
    for (let rownum = 0; rownum < rows.length; rownum++) {
        let cur = rows[rownum].cells;
        let type = (cur[0].firstElementChild as HTMLSelectElement).value;
        let price = parseFloat((cur[1].firstElementChild as HTMLInputElement).value) || 0.0;
        let conts = parseInt((cur[2].firstElementChild as HTMLInputElement).value, 10) || 1;
        if (price > 0.0) {
            switch (type) {
                case "Entry": tl.addEntry(price, conts); break;
                case "Exit": tl.addExit(price, conts); break;
                case "Stop": tl.addStop(price, conts); break;
                default: // nothing
                    break;
            }
        }
    }
}

// recalculate the derived data...
export function reCalc() {
    console.log('RECALC!')
    let tdir = parseInt((document.getElementById('tradeDir') as HTMLSelectElement).value, 10);
    let tinst = new rc.Instrument(
        parseFloat((document.getElementById('tickSize') as HTMLInputElement).value),
        parseFloat((document.getElementById('tickValue') as HTMLInputElement).value)
    );

    let acctSize = parseFloat((document.getElementById('acctVal') as HTMLInputElement).value);
    let mriskDoll = parseFloat((document.getElementById('tradeRisk') as HTMLInputElement).value);

    // fill out trade risk %
    if (acctSize > 0) {
        (document.getElementById('tradeRiskPct') as HTMLSpanElement).innerText =
            (mriskDoll / acctSize * 100).toFixed(3).toString();
    }

    let tradeLog = new rc.Trade(tinst, tdir);
    collectData(tradeLog);

    // fill out derived data
    (document.getElementById('avgEntry') as HTMLSpanElement).innerText =
        tradeLog.avgEntry.toString();
    (document.getElementById('worstExit') as HTMLSpanElement).innerText =
        tradeLog.worstExit.toString();
    (document.getElementById('numContracts') as HTMLSpanElement).innerText =
        tradeLog.numContracts.toString();
    let eer = tradeLog.entryExitRisk;
    let modeer = Math.max(0, eer);
    (document.getElementById('entryExitRisk') as HTMLSpanElement).innerText =
        modeer.toFixed(2) + " (" + (modeer / acctSize * 100).toFixed(3).toString() + "%)";
    (document.getElementById('worstR') as HTMLSpanElement).innerText =
        (-eer / mriskDoll).toFixed(2).toString();

    // fill out R-Values table...
    let rows = (document.getElementById('scaleTbl') as HTMLTableElement).tBodies[0].rows;
    let rval = (tdir > 0) ? (rows.length - 2) : -1;
    let riskTerm = tdir * tinst.TickSize * mriskDoll / tinst.TickValue;
    let zeroPrice = tinst.round((tradeLog.entrySum - tradeLog.exitSum) / tradeLog.remainingOpenContracts, tdir);
    for (let idx = 0; idx < rows.length; idx++) {
        rows[idx].className = "rval-" + rval.toString();
        rows[idx].cells[0].innerText = rval.toString();
        let exactPrice = ((tradeLog.entrySum - tradeLog.exitSum) + (riskTerm * rval)) / tradeLog.remainingOpenContracts;
        let roundedPrice = tinst.round(exactPrice, tdir);
        rows[idx].cells[1].innerText = roundedPrice.toFixed(tinst.TickSizeDigits);
        rows[idx].cells[2].innerText = Math.round((roundedPrice - zeroPrice) / tinst.TickSize).toString();
        rows[idx].cells[3].innerText = exactPrice.toFixed(tinst.TickSizeDigits + 2);
        rval -= tdir;
    }

    // update the B/E adjustment...
    let beTgt = parseFloat((document.getElementById('beTgt') as HTMLInputElement).value);
    let beCnt = parseInt((document.getElementById('beConts') as HTMLInputElement).value);

    (document.getElementById('beEnter') as HTMLSpanElement).innerText =
        ((beTgt * (tradeLog.remainingOpenContracts + beCnt) - (tradeLog.entrySum - tradeLog.exitSum)) /
            beCnt).toString();
}

export function resetAll() {
    (document.getElementById('tradeDir') as HTMLSelectElement).selectedIndex = 0;
    (document.getElementById('tradeRisk') as HTMLInputElement).value = "";

    let tt = (document.getElementById('transTbl') as HTMLTableElement).tBodies[0];
    while (tt.rows.length > 0) {
        tt.deleteRow(-1);
    }
    addTransaction(1);
    addTransaction(2);
    addTransaction(0);
    addTransaction(0);

    (document.getElementById('beTgt') as HTMLInputElement).value = "";
    (document.getElementById('beConts') as HTMLInputElement).value = "";
    reCalc();
}

