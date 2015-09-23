
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
    mr: 1,
    mb: 1,
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
  // startRect and endRect are D3 selections
  this.startRect = sr;
  this.endRect = er;

  // use the selected prop of the start tile to decide whether this grouping is
  // selecting or deselecting
  // TODO a policy configuration: all (de)select or invert for every tile
  this.toSelectp = !sr.datum().selected;

  this.$lastGroupedTiles = $();
};
var grouping = null;

var allTiles = d3.selectAll('.tile-group-grid rect');

// TODO check the event, decide actions, update UI, update model, all happen
// within event handlers. The concrete actions on model should be decoupled using event.
allTiles
  .on('click.select', function(d, i){
    d3.select(this).classed('time-tile-selected',
                            d.selected = !d.selected);

    // console.log('click at: ' + d.weekdayID + ': ' + d.startTimeID);
  })
  .on('mousedown.grouping-start', function(d, i){
    if (d3.event.which != 1)
      return;

    grouping = new GroupingStatus(d3.select(this))

    // Prevent the browser treating the svg elements as image (so no image drag)
    d3.event.preventDefault();

    // console.log('mouse down: ' + d.weekdayID + ': ' + d.startTimeID);
  })
  .on('mouseenter.grouping-move', function(d, i){
    if (!grouping) return;

    var curGroupedTiles = getTiles2Group(grouping.startRect.datum(), d),
        lastGroupedTiles = grouping.$lastGroupedTiles,
        newlySelectedTiles = curGroupedTiles.not(lastGroupedTiles),
        newlyDeselectedTiles = lastGroupedTiles.not(curGroupedTiles);

    // only update the necessary part
    
    // TODO make two-way data binding
    d3.selectAll(newlySelectedTiles.get())
      .classed('time-tile-selected', grouping.toSelectp)
      .each(function(d) {
        d.selected = grouping.toSelectp;
      });

    d3.selectAll(newlyDeselectedTiles.get())
      .classed('time-tile-selected', !grouping.toSelectp)
      .each(function(d) {
        d.selected = !grouping.toSelectp;
      });

    // memorize the current grouped tiles.
    grouping.$lastGroupedTiles = curGroupedTiles;
    grouping.endRect = d3.select(this);

    // console.log('mouse enter: ' + d.weekdayID + ': ' + d.startTimeID);
  })
  .on('mouseup.grouping-end', function(d, i){
    // reset grouping properties to the default
    grouping = null;

    // console.log('mouseup: ' + d.weekdayID + ': ' + d.startTimeID);
  });

// stop grouping when moving out the SVG area
// TODO change the cursor shape to make this effect more obvious
svgDraw.on('mouseleave.grouping-end', function(){
  grouping = null;
});

// get jQuery collection of tiles to group with regards to startRect and endRect
function getTiles2Group(startRect, endRect){
  var weekDayExtent = d3.extent([startRect.weekdayID, endRect.weekdayID]),
      timeExtent = d3.extent([startRect.startTimeID, endRect.startTimeID]),
      tiles = $();

  $('.week-tile-group-grid').slice(weekDayExtent[0], weekDayExtent[1] + 1)
    .each(function(){
      tiles = tiles.add(
        $(this).children().slice(timeExtent[0], timeExtent[1] + 1)
      );
    });

  return tiles;
}

/////////////////////////////////////////////////////////////////
//// About converting jQuery object into D3 selections:
// 
// jQuery *Class family doesn't work with SVG, we can use attr though,
// or update to jQuery 3.0 for now let's use d3.select.
//
// see http://stackoverflow.com/questions/8638621/jquery-svg-why-cant-i-addclass
// for more details
