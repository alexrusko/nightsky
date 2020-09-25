const timeInput = document.getElementById('timePicker');
const constellationToggle = document.getElementById('constellation-toggle');
const skyCanvas = document.getElementById('sky-canvas');
const constellationCanvas = document.getElementById('constellation-canvas');
const skyCtx = skyCanvas.getContext('2d');
const constellationCtx = constellationCanvas.getContext('2d');
const width = skyCanvas.width;
const height = skyCanvas.height;
const starDataParsed = JSON.parse(starData);
let constellationsToggled = false;

let now = new Date();
const lat = dms2real( 47, 29 );
const lon = dms2real( 19, 2 );

drawStars();

function drawStars() {
    const t1 = performance.now();
    starDataParsed.forEach((data) => {
        const { id, deDeg, deMinutes, raHours, raMinutes, magnitude, spectralType } = data;
        const { altitude, x, y } = getPosition(raHours, raMinutes, deDeg, deMinutes)
    
        if (altitude > 0 && magnitude < 6) {
            const size = calculateSize(magnitude);
            const color = getColor(spectralType);
            skyCtx.beginPath();
            skyCtx.fillStyle = color;
            skyCtx.shadowColor = color;
            skyCtx.shadowBlur = 5;
            skyCtx.arc((width / 2) + x, (height / 2) + y, size, 0, 2 * Math.PI)
            skyCtx.fill();
            skyCtx.closePath();   
        }
    });
    const t2 = performance.now();
    console.log('time: ' + (t2 - t1) + 'millis');
};

function clearStars() {
    skyCtx.clearRect(0, 0, width, height);
};

function clearConstellations() {
    constellationCtx.clearRect(0, 0, width, height);
};

function drawConstellations() {
    constellations.forEach((constellation) => {
        for (let i = 0; i < constellation.length; i+= 2) {
            const starFrom = starDataParsed.filter(star => star.id === constellation[i])[0];
            const starTo = starDataParsed.filter(star => star.id === constellation[i+1])[0];
            const {x: x1, y: y1, altitude: altitude1 } = getPosition(starFrom.raHours, starFrom.raMinutes, starFrom.deDeg, starFrom.deMinutes);
            const {x: x2, y: y2, altitude: altitude2 } = getPosition(starTo.raHours, starTo.raMinutes, starTo.deDeg, starTo.deMinutes);
            if (altitude1 > 0 && altitude2 > 0) {
                constellationCtx.shadowBlur = 3;
                constellationCtx.shadowColor = 'white';
                constellationCtx.beginPath();
                constellationCtx.moveTo((width / 2) + x1, (height / 2) + y1);
                constellationCtx.lineTo((width / 2) + x2, (height / 2) + y2);
                constellationCtx.strokeStyle = 'white';
                constellationCtx.lineWidth = 0.3;
                constellationCtx.stroke();
                constellationCtx.closePath();
            }
        }
    });
};

function getPosition(raHours, raMinutes, deDeg, deMinutes) {
    const raReal  = ra2real( raHours, raMinutes );
    const decReal = dms2real( deDeg, deMinutes );
    const [altitude, azimuth] = coordToHorizon(now, raReal, decReal, lat, lon);
    const radius = 300 * Math.cos(altitude * Math.PI/180);
    const x = radius * Math.cos(azimuth * Math.PI/180);
    const y = radius * Math.sin(azimuth * Math.PI/180);
    return { altitude, azimuth, x, y };
}

function calculateSize(magnitude) {
    if (magnitude < 6 && magnitude >= 5) {
        return 0.1;
    } else if (magnitude < 5 && magnitude >= 4) {
        return 0.25;
    } else if (magnitude < 4 && magnitude >= 2.5) {
        return 0.5;
    } else if (magnitude < 2.5 && magnitude >= 1.5) {
        return 1;
    } else if (magnitude < 1.5 && magnitude >= 0.5) {
        return 2;
    } else if (magnitude < 0.5 && magnitude >= -0.5) {
        return 3;
    } else if (magnitude < -0.5 && magnitude >= -1.5) {
        return 4;
    } else {
        return 5;
    }
}

function getColor(spectralType) {
    const spectralClass = spectralType.charAt(0);
    let color = '#fff';
    switch (spectralClass) {
        case 'O':
            color = '#9bb0ff';
            break;
        case 'B':
            color = '#aabfff';
            break;
        case 'A':
            color = '#cad7ff';
            break;
        case 'F':
            color = '#f8f7ff';
            break;
        case 'G':
            color = '#fff4ea';
            break;
        case 'K':
            color = '#ffd2a1';
            break;
        case 'M':
            color = '#ffcc6f';
            break;
    }

    return color;
};

// convert right ascension (hours, minutes) to degrees as real
function ra2real(hr, min) {
    return 15*(hr + min/60);
};

// convert angle (deg, min) to degrees as real
function dms2real(deg, min) {
    return deg < 0 ? deg - min/60 : deg + min/60;
};

function coordToHorizon(utc, ra, dec, lat, lon) {
    // compute hour angle in degrees
    let ha = meanSiderealTime(utc, lon) - ra;
    if (ha < 0) {
        ha = ha + 360;   
    }

    // convert degrees to radians
    const haRad  = ha*Math.PI/180
    const decRad = dec*Math.PI/180
    const latRad = lat*Math.PI/180

    // compute altitude in radians
    const sinAlt = Math.sin(decRad)*Math.sin(latRad) + Math.cos(decRad)*Math.cos(latRad)*Math.cos(haRad);
    const alt = Math.asin(sinAlt);
    
    // compute azimuth in radians
    // divide by zero error at poles or if alt = 90 deg
    const cosAz = (Math.sin(decRad) - Math.sin(alt)*Math.sin(latRad))/(Math.cos(alt)*Math.cos(latRad));
    const az  = Math.acos(cosAz) * 180/Math.PI;

    // convert radians to degrees
    const altitude = alt*180/Math.PI;
    const azimuth  = Math.sin(haRad) > 0 ? 360 - az : az;
	
	return [altitude, azimuth];
};

// Compute the Mean Sidereal Time in units of degrees. 
// Use lon := 0 to get the Greenwich MST. 
// East longitudes are positive; West longitudes are negative
// returns: time in degrees
function meanSiderealTime(now, lon) {
    let year   = now.getUTCFullYear();
    let month  = now.getUTCMonth() + 1;
    const day    = now.getUTCDate();
    const hour   = now.getUTCHours();
    const minute = now.getUTCMinutes();
    const second = now.getUTCSeconds();

    if ((month == 1) || (month == 2)) {
        year  = year - 1;
        month = month + 12;
    }

    const a = Math.floor(year/100);
    const b = 2 - a + Math.floor(a/4);
    const c = Math.floor(365.25*year);
    const d = Math.floor(30.6001*(month + 1));

    // days since J2000.0
    const jd = b + c + d - 730550.5 + day + (hour + minute/60.0 + second/3600.0)/24.0;
    
    // julian centuries since J2000.0
    const jt = jd/36525.0;

    // the mean sidereal time in degrees
    let mst = 280.46061837 + 360.98564736629*jd + 0.000387933*jt*jt - jt*jt*jt/38710000 + lon;

    // in degrees modulo 360.0
    if (mst > 0.0) {
        while (mst > 360.0) mst = mst - 360.0;
    } else {
        while (mst < 0.0) mst = mst + 360.0;
    }
        
    return mst;
}

timeInput.oninput = (e) => {
    const { value } = e.target;
    if (value) {
        now = new Date(value);
        clearStars();
        drawStars();
        
        if (constellationsToggled) {
            clearConstellations();
            drawConstellations();
        }
    }
};

constellationToggle.onchange = (e) => {
    constellationsToggled = e.target.checked;
    constellationsToggled ? drawConstellations() : clearConstellations();
}
