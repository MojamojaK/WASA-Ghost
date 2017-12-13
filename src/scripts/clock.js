class Clock extends EventEmitter {

  constructor(dateNode, timeNode, freqNode){
    super()
    this.dateNode = dateNode
    this.timeNode = timeNode
    this.freqNode = freqNode
    this.freqCount = 0
    this.timeout = undefined
    displayTime()
    this.on('update', updateFreq)
  }

  displayTime(){
    let d = new Date();
    this.dateNode.html(d.toLocaleDateString());
    this.timeNode.html(d.toLocaleTimeString());
    setTimeout(displayTime, 1000 - d % 1000);
    this.freqNode.html(this.freqCount + "Hz");
    this.freqCount = 0;
  }

  updateFreq(){
    clearTimeout(this.timeout)
    this.freqNode.css({backgroundColor: "green"})
    this.timeout = setTimeout(function() {
      this.freqNode.css({backgroundColor: "black"})
    }, 1000)
    this.freqCount++;
  }

}
