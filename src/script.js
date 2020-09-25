const canvas = document.getElementById('sky-canvas');
const ctx = canvas.getContext('2d');
canvas.style.transform = 'rotate(-90deg)';
const width = canvas.width;
const height = canvas.height;
const starDataParsed = JSON.parse(starData);

const now = new Date();
const lat = dms2real( 47, 29 );
const lon = dms2real( 19, 2 );

starDataParsed.forEach((data) => {
    const { id, deDeg, deMinutes, raHours, raMinutes, magnitude, spectralType } = data;
    const { altitude, x, y } = getPosition(raHours, raMinutes, deDeg, deMinutes)

    if (altitude > 0 && magnitude < 6) {
        const size = calculateSize(magnitude);
        const color = getColor(spectralType);
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 5;
        ctx.arc((width / 2) + x, (height / 2) + y, size, 0, 2 * Math.PI)
        ctx.fill();
        ctx.closePath();   
    }
});

drawConstellation();
function drawConstellation() {
    constellations.forEach((constellation) => {
        constellation.split(',').forEach((part) => {
            const starFrom = starDataParsed.filter(star => star.id == part.split(' ')[0])[0];
            const starTo = starDataParsed.filter(star => star.id == part.split(' ')[1])[0];
            
            const {x: x1, y: y1} = getPosition(starFrom.raHours, starFrom.raMinutes, starFrom.deDeg, starFrom.deMinutes);
            const {x: x2, y: y2} = getPosition(starTo.raHours, starTo.raMinutes, starTo.deDeg, starTo.deMinutes);
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo((width / 2) + x1, (height / 2) + y1);
            ctx.lineTo((width / 2) + x2, (height / 2) + y2);
            ctx.strokeStyle = "white";
            ctx.lineWidth = 0.3;
            ctx.stroke();
            ctx.closePath();
        });
    });
}

function getPosition(raHours, raMinutes, deDeg, deMinutes) {
    const raReal  = ra2real( raHours, raMinutes );
    const decReal = dms2real( deDeg, deMinutes );
    const [altitude, azimuth] = coordToHorizon(now, raReal, decReal, lat, lon);
    const radius = 300 * Math.cos(altitude * 0.0174532925);
    const x = radius * Math.cos(azimuth * 0.0174532925);
    const y = radius * Math.sin(azimuth * 0.0174532925);
    return { altitude, azimuth, x, y };
}

function calculateSize(magnitude) {
    if (magnitude < 6 && magnitude >= 5) {
        return 0.08;
    } else if (magnitude < 5 && magnitude >= 4) {
        return 0.15;
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
function ra2real( hr, min ) {
    return 15*(hr + min/60);
};

// convert angle (deg, min) to degrees as real
function dms2real( deg, min ) {
    return deg < 0 ? deg - min/60 : deg + min/60;
};

function coordToHorizon( utc, ra, dec, lat, lon ) {
    // compute hour angle in degrees
    let ha = meanSiderealTime( utc, lon ) - ra;
    if (ha < 0) ha = ha + 360;

    // convert degrees to radians
    ha  = ha*Math.PI/180
    dec = dec*Math.PI/180
    lat = lat*Math.PI/180

    // compute altitude in radians
    const sinAlt = Math.sin(dec)*Math.sin(lat) + Math.cos(dec)*Math.cos(lat)*Math.cos(ha);
    const alt = Math.asin(sinAlt);
    
    // compute azimuth in radians
    // divide by zero error at poles or if alt = 90 deg
    const cosAz = (Math.sin(dec) - Math.sin(alt)*Math.sin(lat))/(Math.cos(alt)*Math.cos(lat));
    const az  = Math.acos(cosAz);

    // convert radians to degrees
    const altitude = alt*180/Math.PI;
    let azimuth  = az*180/Math.PI;

    // choose hemisphere
	if (Math.sin(ha) > 0) azimuth = 360 - azimuth;
	
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
    if (mst > 0.0) 
        while (mst > 360.0) mst = mst - 360.0;
    else
        while (mst < 0.0)   mst = mst + 360.0;
        
    return mst;
}
