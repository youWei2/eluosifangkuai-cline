// 俄罗斯方块游戏逻辑

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextPieceCanvas = document.getElementById('nextPiece');
const nextPieceCtx = nextPieceCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const startButton = document.getElementById('startButton');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

// 游戏常量
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    null,
    '#FF0D72', // I
    '#0DC2FF', // J
    '#0DFF72', // L
    '#F538FF', // O
    '#FF8E0D', // S
    '#FFE138', // T
    '#3877FF'  // Z
];

// 方块形状定义
const SHAPES = [
    null,
    [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], // I
    [[1,0,0], [1,1,1], [0,0,0]],                   // J
    [[0,0,1], [1,1,1], [0,0,0]],                   // L
    [[1,1], [1,1]],                                // O
    [[0,1,1], [1,1,0], [0,0,0]],                   // S
    [[0,1,0], [1,1,1], [0,0,0]],                   // T
    [[1,1,0], [0,1,1], [0,0,0]]                    // Z
];

// 游戏状态
let board = [];
let score = 0;
let level = 1;
let gameOver = false;
let isPaused = false;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let currentPiece = null;
let nextPiece = null;

// 初始化游戏板
function createBoard() {
    return Array.from(Array(ROWS), () => Array(COLS).fill(0));
}

// 创建随机方块
function createPiece() {
    const rand = Math.floor(Math.random() * 7) + 1;
    return {
        shape: SHAPES[rand],
        color: COLORS[rand],
        pos: {x: Math.floor(COLS / 2) - 1, y: 0}
    };
}

// 旋转方块
function rotate(piece) {
    const rotated = piece.shape[0].map((_, index) =>
        piece.shape.map(row => row[index]).reverse()
    );
    return rotated;
}

// 检查碰撞
function collide(piece, board) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x] !== 0) {
                const boardX = piece.pos.x + x;
                const boardY = piece.pos.y + y;
                if (
                    boardX < 0 || 
                    boardX >= COLS || 
                    boardY >= ROWS ||
                    (boardY >= 0 && board[boardY][boardX] !== 0)
                ) {
                    return true;
                }
            }
        }
    }
    return false;
}

// 合并方块到游戏板
function merge(piece, board) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[piece.pos.y + y][piece.pos.x + x] = value;
            }
        });
    });
}

// 清除完整行
function clearLines(board) {
    let linesCleared = 0;
    outer: for (let y = board.length - 1; y >= 0; y--) {
        for (let x = 0; x < board[y].length; x++) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }
        
        // 移除完整行
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        linesCleared++;
        y++; // 重新检查同一行索引
    }
    
    if (linesCleared > 0) {
        // 更新得分
        const points = [0, 40, 100, 300, 1200]; // 消行得分
        score += points[linesCleared] * level;
        scoreElement.textContent = score;
        
        // 更新等级
        level = Math.floor(score / 1000) + 1;
        levelElement.textContent = level;
        
        // 更新下落速度
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
    }
}

// 绘制方块
function drawBlock(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    
    ctx.strokeStyle = '#000';
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    
    // 添加3D效果
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, 2);
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, 2, BLOCK_SIZE);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(x * BLOCK_SIZE + BLOCK_SIZE - 2, y * BLOCK_SIZE, 2, BLOCK_SIZE);
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE + BLOCK_SIZE - 2, BLOCK_SIZE, 2);
}

// 绘制下一个方块
function drawNextPiece() {
    nextPieceCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    
    if (!nextPiece) return;
    
    const shape = nextPiece.shape;
    const color = nextPiece.color;
    
    // 居中绘制
    const offsetX = (nextPieceCanvas.width - shape[0].length * BLOCK_SIZE) / 2;
    const offsetY = (nextPieceCanvas.height - shape.length * BLOCK_SIZE) / 2;
    
    shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                nextPieceCtx.fillStyle = color;
                nextPieceCtx.fillRect(
                    offsetX + x * BLOCK_SIZE, 
                    offsetY + y * BLOCK_SIZE, 
                    BLOCK_SIZE, 
                    BLOCK_SIZE
                );
                
                nextPieceCtx.strokeStyle = '#000';
                nextPieceCtx.strokeRect(
                    offsetX + x * BLOCK_SIZE, 
                    offsetY + y * BLOCK_SIZE, 
                    BLOCK_SIZE, 
                    BLOCK_SIZE
                );
            }
        });
    });
}

// 绘制游戏板
function draw() {
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制游戏板
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                drawBlock(x, y, COLORS[value]);
            }
        });
    });
    
    // 绘制当前方块
    if (currentPiece) {
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    drawBlock(
                        currentPiece.pos.x + x, 
                        currentPiece.pos.y + y, 
                        currentPiece.color
                    );
                }
            });
        });
    }
}

// 更新游戏状态
function update(time = 0) {
    if (gameOver || isPaused) return;
    
    const deltaTime = time - lastTime;
    lastTime = time;
    
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        drop();
        dropCounter = 0;
    }
    
    draw();
    requestAnimationFrame(update);
}

// 方块下落
function drop() {
    if (!currentPiece) return;
    
    currentPiece.pos.y++;
    if (collide(currentPiece, board)) {
        currentPiece.pos.y--;
        merge(currentPiece, board);
        clearLines(board);
        resetPiece();
        
        if (collide(currentPiece, board)) {
            gameOver = true;
            gameOverElement.style.display = 'block';
            finalScoreElement.textContent = score;
        }
    }
}

// 移动方块
function move(dir) {
    if (!currentPiece || gameOver || isPaused) return;
    
    currentPiece.pos.x += dir;
    if (collide(currentPiece, board)) {
        currentPiece.pos.x -= dir;
    }
}

// 旋转方块
function rotatePiece() {
    if (!currentPiece || gameOver || isPaused) return;
    
    const originalShape = currentPiece.shape;
    currentPiece.shape = rotate(currentPiece);
    
    if (collide(currentPiece, board)) {
        currentPiece.shape = originalShape;
    }
}

// 瞬间下落
function hardDrop() {
    if (!currentPiece || gameOver || isPaused) return;
    
    while (!collide(currentPiece, board)) {
        currentPiece.pos.y++;
    }
    currentPiece.pos.y--;
    drop();
}

// 重置方块
function resetPiece() {
    currentPiece = nextPiece || createPiece();
    nextPiece = createPiece();
    drawNextPiece();
}

// 初始化游戏
function init() {
    board = createBoard();
    score = 0;
    level = 1;
    gameOver = false;
    isPaused = false;
    dropInterval = 1000;
    
    scoreElement.textContent = score;
    levelElement.textContent = level;
    gameOverElement.style.display = 'none';
    
    nextPiece = createPiece();
    resetPiece();
    
    update();
}

// 键盘控制
document.addEventListener('keydown', event => {
    if (gameOver) return;
    
    switch (event.keyCode) {
        case 37: // 左箭头
            move(-1);
            break;
        case 39: // 右箭头
            move(1);
            break;
        case 40: // 下箭头
            drop();
            break;
        case 38: // 上箭头
            rotatePiece();
            break;
        case 32: // 空格
            hardDrop();
            break;
        case 80: // P键暂停
            togglePause();
            break;
    }
});

// 按钮事件
startButton.addEventListener('click', () => {
    if (gameOver) {
        init();
    } else {
        togglePause();
    }
});

restartButton.addEventListener('click', () => {
    init();
});

function togglePause() {
    if (gameOver) return;
    
    isPaused = !isPaused;
    if (!isPaused) {
        lastTime = performance.now();
        update();
    }
}

// 初始化游戏
init();