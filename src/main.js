var TimeTile = function(wd, st){
  this.weekdayID = wd;
  this.startTimeID = st;
  this.selected = false;
};

var tileGroup = [];

var weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

var config = {
  // ~hour
  timeUnit: 1,

  canvas: {
    mt: 50,
    ml: 50,
  },
  tile: {
    w: 25,
    h: 25,
    mr: 2,
    mb: 2,
  },
};

config.colNums = Math.floor(24 / config.timeUnit);

for(var i = 0; i < 7; i++){
  var weekTileGroup = [];
  for(var j = 0; j < config.colNums; j++){
    weekTileGroup.push(new TimeTile(i, j));
  }
  tileGroup.push(weekTileGroup);
}

///////////////////////////////////////////////////////////////// 
var svgDraw = d3.select('#draw > svg'),
    svgCanvas = svgDraw
      .append('g')
      .attr('transform',
            'translate(' + config.canvas.ml + ', ' + config.canvas.mt + ')');

svgDraw
  .append('g')
  .attr('class', 'week-day-label')
  .attr('transform', 'translate(5, ' + config.canvas.mt + ')')
  .selectAll('text')
  .data(weekDays)
  .enter()
  .append('text')
  .text(function(d){ return d; })
// .attr('x', 0)
  .attr('y', function(d, idx){ return (config.tile.h + config.tile.mb) * idx; })
  .attr('dy', '1em');

svgDraw
  .append('g')
  .attr('class', 'time-unit-label')
  .attr('transform', 'translate(' + config.canvas.ml +', ' + config.canvas.mt + ')')
  .selectAll('text')
  .data(
    // create a sequence for time units
    //Array.apply(null, Array(config.colNums)).map(function(_,i) { return i; })
    Array(config.colNums)
  )
  .enter()
  .append('text')
  .text(function(_,i){ return i;})
  .attr('text-anchor', 'middle')
  .attr('dy', '-5')
// .attr('y', 0)
  .attr('x', function(_,i){ return (config.tile.w + config.tile.mr)* i; });

svgDraw.on('click', function(){ d3.event.preventDefault(); })

svgCanvas
  .append('g')
  .attr('class', 'tile-group-grid')
  .selectAll('g')
  .data(tileGroup)
  .enter()
  .append('g')
  .attr('class', 'week-tile-group-grid')
  .attr('transform', function(_,idx){
    return 'translate(0, ' + (config.tile.h + config.tile.mb) * idx + ')'; })
  .each(function(d,idx){
    // recursively build up every row
    d3.select(this)
      .selectAll('rect')
      .data(d)
      .enter()
      .append('rect')
      .attr('class', 'time-tile')
      .attr('x', function(d){ return (config.tile.w + config.tile.mr ) * d.startTimeID; })
      .attr('width', config.tile.w)
      .attr('height', config.tile.h)
      .classed('time-tile-selected', function(d){ return d.selected; });
  });

/////////////////////////////////////////////////////////////////
// Interactivity

var GroupingStatus = function(sr, er){
  this.startRect = sr;
  this.endRect = er;
  // use the selected prop of the first mousedown tile to decide whether this
  // group is selecting or unselecting
  this.toSelectp = !sr.datum().selected;
};
var grouping = null;

var allTiles = d3.selectAll('.tile-group-grid rect');

// TODO check the event, decide actions, update UI, update model, all happen
// within event handlers. The concrete actions on model should be decoupled using event.
allTiles
  .on('click.select', function(d, i){
    var target = d3.select(d3.event.target);

    d.selected = !d.selected;
    target.classed('time-tile-selected', d.selected);

    // debug
    // console.log('click at: ' + d.weekdayID + ': ' + d.startTimeID);
  })
  .on('mousedown.grouping-start', function(d, i){
    if (d3.event.which != 1){
      // only for grouping for now
      return;
    }
    
    grouping = new GroupingStatus(d3.select(this))

    // Prevent the browser treating the svg elements as image (so no image drag)
    d3.event.preventDefault();

    // console.log('mouse down: ' + d.weekdayID + ': ' + d.startTimeID);
  })
  .on('mouseenter.grouping-move', function(d, i){
    if (!grouping) return;

    var startRect = grouping.startRect,
        endRect = grouping.endRect,
        toSelectp = grouping.toSelectp;

    if (endRect){
      // clear the previous selection
      // 
      // TODO highly inefficient, make groupTiles to return the selection to
      // make things easier.
      groupTiles(startRect.datum(), endRect.datum(), !toSelectp);  
    }
    
    endRect = grouping.endRect = d3.select(this); // target is this

    // TODO with these two arguments we can simplify 'groupTiles'
    groupTiles(startRect.datum(), endRect.datum(), toSelectp);

    // console.log('mouse enter: ' + d.weekdayID + ': ' + d.startTimeID);
  })
  .on('mouseup.grouping-end', function(d, i){
    // reset grouping properties to the default
    grouping = null;

    // console.log('mouseup: ' + d.weekdayID + ': ' + d.startTimeID);
  });

// test for grouping
function groupTiles(startG, endG, toSelectp){
  // make sure the startG is always before endG
  if (startG.weekdayID > endG.weekdayID
      || ( startG.weekdayID == endG.weekdayID && startG.startTimeID > endG.startTimeID )){
    var tmpG = startG;
    startG = endG;
    endG = tmpG;
  }

  toSelectp = toSelectp || false;

  $($('.week-tile-group-grid').get(startG.weekdayID))
    .nextUntil($('.week-tile-group-grid').get(endG.weekdayID + 1))
    .addBack()
    .each(function(){
      $($(this).children().get(startG.startTimeID))
        .nextUntil( $(this).children().get(endG.startTimeID + 1) )
        .addBack().each(function(){
          // jQuery *Class family doesn't work with SVG, we can use attr though,
          // or update to jQuery 3.0 for now let's use d3.select.
          //
          // see http://stackoverflow.com/questions/8638621/jquery-svg-why-cant-i-addclass
          // for more details
          d3.select(this).classed('time-tile-selected', function(d){
            return d.selected = toSelectp;
          });
        });
    });
}
