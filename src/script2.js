var canvas = document.getElementById("testCanvas");
var ctx     = canvas.getContext("2d");
canvas.style.transform = 'rotate(-90deg)'
const width = canvas.width;
const height = canvas.height;
var angle = 180;
var r = 300;
var x = r * Math.cos(angle * 0.0174532925);
var y = r * Math.sin(angle * 0.0174532925);
console.log(x, y)

ctx.arc((width / 2) + x, (height / 2) + y, 5, 0, 2 * Math.PI)
ctx.fill();
// ctx.beginPath();
// ctx.moveTo(50, 50);
// ctx.lineTo(50+x, 50+y);
// ctx.stroke();
