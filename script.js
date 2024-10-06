const RESOLUTION = 800;

let canvas;
let ctxt;
let graph;
let closestNode = -1;

window.onload = () => {
    canvas = document.getElementById("canvas");
    canvas.width = RESOLUTION;
    canvas.height = RESOLUTION;
    ctxt = canvas.getContext("2d");

    canvas.addEventListener("mousemove", (e) => {
        let rect = canvas.getBoundingClientRect();
        let x = e.offsetX / rect.width;
        let y = e.offsetY / rect.height;
        closestNode = graph.closestNodeTo(x, y);
    })
    canvas.addEventListener("mouseleave", () => {
        closestNode = -1;
    })
    canvas.addEventListener("mouseout", () => {
        closestNode = -1;
    })

    graph = new Graph(12, 0.2);

    loop();
}

function loop() {
    ctxt.clearRect(0, 0, canvas.width, canvas.height);

    ctxt.save();
    ctxt.setTransform(RESOLUTION, 0, 0, RESOLUTION, 0, 0);

    graph.render(ctxt, closestNode);

    ctxt.restore();

    requestAnimationFrame(loop);
}

class Graph {
    constructor(n, connectionDensity) {
        this.nodes = [];
        for (let i = 0; i < n; i++) {
            this.nodes.push(
                new GraphNode(
                    0.8 * Math.random() + 0.1,
                    0.8 * Math.random() + 0.1
                )
            );
        }

        this.adjacencyMatrix = [];
        for (let i = 0; i < n; i++) {
            let row = [];
            for (let j = 0; j < n; j++) {
                row.push(false);
            }
            this.adjacencyMatrix.push(row);
        }

        for(let i=0;i<this.adjacencyMatrix.length;i++) {
            for(let j=0;j<this.adjacencyMatrix[i].length;j++) {
                if(i <= j) {
                    continue;
                }

                let connected = Math.random() < connectionDensity;
                this.adjacencyMatrix[i][j] = connected;
                this.adjacencyMatrix[j][i] = connected;
            }
        }

        this.shortestCycle = this.computeShortestCycle();
    }

    computeShortestCycle() {
        let best = null;
        for(let i=0;i<this.nodes.length;i++) {
            let current = this.computeShortestCycleOf(i);
            if((best?.length ?? Infinity) > (current?.length ?? Infinity)) {
                best = current;
            }
        }
        return best;
    }

    computeShortestCycleOf(nodeIndex) {
        let originatingDict = {};
        originatingDict[nodeIndex] = null;
        /**
         * Queue containing element and search branch of BFS
         */
        let queue = [];
        let cyclePartner1 = -1;
        let cyclePartner2 = -1;

        for(let i=0;i<this.adjacencyMatrix[nodeIndex].length;i++) {
            if (!this.adjacencyMatrix[nodeIndex][i]) {
                continue;
            }

            originatingDict[i] = nodeIndex;
            queue.push([i, i]);
        }

        search: while (queue.length > 0) {
            let [next, branch] = queue.shift();
            let pendingQueue = [];

            for (let i = 0; i < this.adjacencyMatrix[next].length; i++) {
                if (!this.adjacencyMatrix[next][i]) {
                    continue;
                }

                // NOTE: was this node discovered from a different search-branch?
                if(queue.some(([n, b]) => n === i && b !== branch)) {
                    // MARK: cycle found
                    cyclePartner1 = i;
                    cyclePartner2 = next;
                    break search;
                }
                if (i in originatingDict) {
                    // MARK: we already know a great path
                    continue;
                }

                originatingDict[i] = next;
                pendingQueue.push([i, branch]);
            }

            queue.push(...pendingQueue);
        }

        if(cyclePartner1 === -1 || cyclePartner2 === -1) {
            return null;
        }

        let chain1 = [];
        let chain2 = [];
        let index1 = cyclePartner1;
        let index2 = cyclePartner2;
        while(index1 !== nodeIndex) {
            chain1.push(index1);
            index1 = originatingDict[index1];
        }
        while(index2 !== nodeIndex) {
            chain2.push(index2);
            index2 = originatingDict[index2];
        }

        return [nodeIndex].concat(chain2.reverse()).concat(chain1);
    }

    closestNodeTo(x, y) {
        let best = -1;
        let bestDistance = Infinity;
        for(let i=0;i<this.nodes.length;i++) {
            let distance = Math.hypot(y - this.nodes[i].y, x - this.nodes[i].x);
            if(distance < bestDistance) {
                best = i;
                bestDistance = distance;
            }
        }
        return best;
    }

    render(ctxt, closestNode) {
        ctxt.strokeStyle = "#FFF";
        ctxt.lineWidth = 0.003;
        for (let i = 0; i < this.adjacencyMatrix.length; i++) {
            for (let j = 0; j < this.adjacencyMatrix[i].length; j++) {
                if (!this.adjacencyMatrix[i][j]) {
                    continue;
                }

                ctxt.beginPath();
                ctxt.moveTo(this.nodes[i].x, this.nodes[i].y);
                ctxt.lineTo(this.nodes[j].x, this.nodes[j].y);
                ctxt.stroke();
            }
        }

        if(closestNode !== -1) {
            let path = this.computeShortestCycleOf(closestNode);
            if(path !== null) {
                ctxt.strokeStyle = "#09F";
                ctxt.beginPath();
                ctxt.moveTo(this.nodes[path[0]].x, this.nodes[path[0]].y);
                for(let i=0;i<path.length;i++) {
                    ctxt.lineTo(this.nodes[path[i]].x, this.nodes[path[i]].y);
                }
                ctxt.closePath();
                ctxt.stroke();
            }
        } else {
            if(this.shortestCycle !== null) {
                ctxt.strokeStyle = "#09F";
                ctxt.beginPath();
                ctxt.moveTo(this.nodes[this.shortestCycle[0]].x, this.nodes[this.shortestCycle[0]].y);
                for(let i=0;i<this.shortestCycle.length;i++) {
                    ctxt.lineTo(this.nodes[this.shortestCycle[i]].x, this.nodes[this.shortestCycle[i]].y);
                }
                ctxt.closePath();
                ctxt.stroke();
            }
        }

        for (let i=0;i<this.nodes.length;i++) {
            if(i === closestNode) {
                ctxt.fillStyle = "#F90";
            } else {
                ctxt.fillStyle = "#000";
            }
            ctxt.beginPath();
            ctxt.arc(this.nodes[i].x, this.nodes[i].y, 0.005, 0, 2 * Math.PI);
            ctxt.fill();
        }
    }
}

class GraphNode {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
