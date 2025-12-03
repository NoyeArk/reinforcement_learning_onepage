// 全局变量
let envData = null;
let stateValues = null;
let policy = null;
let canvas, ctx;
let cellSize = 80;
let gridWidth = 5;
let gridHeight = 5;
let isAutoPlaying = false;
let autoPlayInterval = null;
let forbiddenStates = [[2, 1], [3, 3], [1, 3]]; // 默认禁止状态
let currentAgentPos = null; // 当前智能体位置
let totalIterations = 0; // 总迭代次数
let currentIteration = 0; // 当前查看的迭代次数

// 颜色定义
const colors = {
    background: '#f9f9f9',
    grid: '#ddd',
    start: '#4CAF50',
    target: '#2196F3',
    forbidden: '#FF9800',
    agent: '#F44336',
    trajectory: '#9C27B0',
    policy: '#00BCD4',
    text: '#333'
};

// 初始化Canvas
function initCanvas() {
    canvas = document.getElementById('gridCanvas');
    ctx = canvas.getContext('2d');
    
    if (envData) {
        gridWidth = envData.env_size[0];
        gridHeight = envData.env_size[1];
    }
    
    canvas.width = gridWidth * cellSize + 100;
    canvas.height = gridHeight * cellSize + 100;
    
    drawGrid();
}

// 绘制网格
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const offsetX = 50;
    const offsetY = 50;
    
    // 绘制网格线
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= gridWidth; i++) {
        ctx.beginPath();
        ctx.moveTo(offsetX + i * cellSize, offsetY);
        ctx.lineTo(offsetX + i * cellSize, offsetY + gridHeight * cellSize);
        ctx.stroke();
    }
    
    for (let i = 0; i <= gridHeight; i++) {
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY + i * cellSize);
        ctx.lineTo(offsetX + gridWidth * cellSize, offsetY + i * cellSize);
        ctx.stroke();
    }
    
    if (!envData) return;
    
    // 绘制特殊状态
    // 目标状态（如果不在智能体位置）
    if (!currentAgentPos || 
        envData.target_state[0] !== currentAgentPos[0] || 
        envData.target_state[1] !== currentAgentPos[1]) {
        drawCell(envData.target_state[0], envData.target_state[1], colors.target, 'T');
    }
    
    // 禁止状态
    envData.forbidden_states.forEach(state => {
        if (!currentAgentPos || state[0] !== currentAgentPos[0] || state[1] !== currentAgentPos[1]) {
            drawCell(state[0], state[1], colors.forbidden, 'X');
        }
    });
    
    // 起始状态（始终绘制，智能体会覆盖在上面）
    // 注意：如果智能体在起始位置，智能体会覆盖起始标记，但标记仍然会被绘制作为背景
    drawCell(envData.start_state[0], envData.start_state[1], colors.start, 'S');
    
    // 绘制状态值
    if (stateValues) {
        stateValues.forEach((value, idx) => {
            const x = idx % gridWidth;
            const y = Math.floor(idx / gridWidth);
            // 如果当前位置有智能体，不绘制状态值（避免重叠）
            if (!currentAgentPos || x !== currentAgentPos[0] || y !== currentAgentPos[1]) {
                drawValue(x, y, value.toFixed(2));
            }
        });
    }
    
    // 绘制策略
    if (policy) {
        policy.forEach(p => {
            // 如果当前位置有智能体，不绘制策略箭头（避免重叠）
            if (!currentAgentPos || p.x !== currentAgentPos[0] || p.y !== currentAgentPos[1]) {
                drawPolicy(p.x, p.y, p.action);
            }
        });
    }
}

// 绘制单元格
function drawCell(x, y, color, label) {
    const offsetX = 50;
    const offsetY = 50;
    
    ctx.fillStyle = color;
    ctx.fillRect(
        offsetX + x * cellSize + 2,
        offsetY + y * cellSize + 2,
        cellSize - 4,
        cellSize - 4
    );
    
    if (label) {
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            label,
            offsetX + x * cellSize + cellSize / 2,
            offsetY + y * cellSize + cellSize / 2
        );
    }
}

// 绘制状态值
function drawValue(x, y, value) {
    const offsetX = 50;
    const offsetY = 50;
    
    ctx.fillStyle = colors.text;
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
        value,
        offsetX + x * cellSize + cellSize / 2,
        offsetY + y * cellSize + cellSize / 2 - 15
    );
}

// 绘制策略（箭头）
function drawPolicy(x, y, action) {
    const offsetX = 50;
    const offsetY = 50;
    const centerX = offsetX + x * cellSize + cellSize / 2;
    const centerY = offsetY + y * cellSize + cellSize / 2;
    
    const [dx, dy] = action;
    const arrowLength = cellSize * 0.3;
    
    ctx.strokeStyle = colors.policy;
    ctx.fillStyle = colors.policy;
    ctx.lineWidth = 3;
    
    if (dx === 0 && dy === 0) {
        // STAY - 绘制圆圈
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
        ctx.fill();
    } else {
        // 绘制箭头
        const endX = centerX + dx * arrowLength;
        const endY = centerY + dy * arrowLength;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // 箭头头部
        const angle = Math.atan2(dy, dx);
        const arrowSize = 8;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - arrowSize * Math.cos(angle - Math.PI / 6),
            endY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            endX - arrowSize * Math.cos(angle + Math.PI / 6),
            endY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
    }
}

// 绘制智能体
function drawAgent(x, y) {
    const offsetX = 50;
    const offsetY = 50;
    
    // 更新当前智能体位置
    currentAgentPos = [x, y];
    
    // 绘制智能体背景圆圈
    ctx.fillStyle = colors.agent;
    ctx.beginPath();
    ctx.arc(
        offsetX + x * cellSize + cellSize / 2,
        offsetY + y * cellSize + cellSize / 2,
        12,
        0,
        2 * Math.PI
    );
    ctx.fill();
    
    // 绘制星号
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
        '★',
        offsetX + x * cellSize + cellSize / 2,
        offsetY + y * cellSize + cellSize / 2
    );
}

// 获取参数设置
function getEnvironmentParams() {
    const algorithm = document.getElementById('algorithmSelect').value;
    const gridWidth = parseInt(document.getElementById('gridWidth').value) || 5;
    const gridHeight = parseInt(document.getElementById('gridHeight').value) || 5;
    const startX = parseInt(document.getElementById('startX').value) || 0;
    const startY = parseInt(document.getElementById('startY').value) || 0;
    const targetX = parseInt(document.getElementById('targetX').value) || 4;
    const targetY = parseInt(document.getElementById('targetY').value) || 4;
    
    return {
        algorithm: algorithm,
        env_size: [gridWidth, gridHeight],
        start_state: [startX, startY],
        target_state: [targetX, targetY],
        forbidden_states: forbiddenStates
    };
}

// 更新输入框的最大值限制
function updateInputLimits() {
    const gridWidth = parseInt(document.getElementById('gridWidth').value) || 5;
    const gridHeight = parseInt(document.getElementById('gridHeight').value) || 5;
    const maxX = Math.max(0, gridWidth - 1);
    const maxY = Math.max(0, gridHeight - 1);
    
    document.getElementById('startX').max = maxX;
    document.getElementById('startY').max = maxY;
    document.getElementById('targetX').max = maxX;
    document.getElementById('targetY').max = maxY;
    document.getElementById('forbiddenX').max = maxX;
    document.getElementById('forbiddenY').max = maxY;
}

// 渲染禁止状态列表
function renderForbiddenStates() {
    const container = document.getElementById('forbiddenStates');
    container.innerHTML = '';
    
    if (forbiddenStates.length === 0) {
        container.innerHTML = '<div style="color: #999; font-size: 12px; text-align: center; padding: 10px;">暂无禁止状态</div>';
        return;
    }
    
    forbiddenStates.forEach((state) => {
        const item = document.createElement('div');
        item.className = 'forbidden-item';
        const button = document.createElement('button');
        button.className = 'remove-btn';
        button.setAttribute('data-x', state[0]);
        button.setAttribute('data-y', state[1]);
        button.textContent = '删除';
        button.addEventListener('click', function() {
            removeForbiddenState(state[0], state[1]);
        });
        
        const span = document.createElement('span');
        span.textContent = `(${state[0]}, ${state[1]})`;
        
        item.appendChild(span);
        item.appendChild(button);
        container.appendChild(item);
    });
}

// 添加禁止状态
function addForbiddenState() {
    const x = parseInt(document.getElementById('forbiddenX').value);
    const y = parseInt(document.getElementById('forbiddenY').value);
    
    if (isNaN(x) || isNaN(y)) {
        alert('请输入有效的坐标');
        return;
    }
    
    const gridWidth = parseInt(document.getElementById('gridWidth').value) || 5;
    const gridHeight = parseInt(document.getElementById('gridHeight').value) || 5;
    
    if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) {
        alert(`坐标超出范围！网格大小为 ${gridWidth}x${gridHeight}`);
        return;
    }
    
    const state = [x, y];
    
    // 检查是否已存在
    if (forbiddenStates.some(s => s[0] === x && s[1] === y)) {
        alert('该位置已经是禁止状态');
        return;
    }
    
    // 检查是否与起始位置或目标位置冲突
    const startX = parseInt(document.getElementById('startX').value) || 0;
    const startY = parseInt(document.getElementById('startY').value) || 0;
    const targetX = parseInt(document.getElementById('targetX').value) || 4;
    const targetY = parseInt(document.getElementById('targetY').value) || 4;
    
    if (x === startX && y === startY) {
        alert('不能将起始位置设为禁止状态');
        return;
    }
    
    if (x === targetX && y === targetY) {
        alert('不能将目标位置设为禁止状态');
        return;
    }
    
    forbiddenStates.push(state);
    renderForbiddenStates();
    
    // 清空输入框
    document.getElementById('forbiddenX').value = '';
    document.getElementById('forbiddenY').value = '';
}

// 删除禁止状态
function removeForbiddenState(x, y) {
    forbiddenStates = forbiddenStates.filter(s => !(s[0] === x && s[1] === y));
    renderForbiddenStates();
}

// API调用函数
async function initEnvironment() {
    try {
        const params = getEnvironmentParams();
        
        // 验证参数
        if (params.env_size[0] < 2 || params.env_size[1] < 2) {
            alert('网格大小至少为 2x2');
            return;
        }
        
        if (params.start_state[0] < 0 || params.start_state[0] >= params.env_size[0] ||
            params.start_state[1] < 0 || params.start_state[1] >= params.env_size[1]) {
            alert('起始位置超出网格范围');
            return;
        }
        
        if (params.target_state[0] < 0 || params.target_state[0] >= params.env_size[0] ||
            params.target_state[1] < 0 || params.target_state[1] >= params.env_size[1]) {
            alert('目标位置超出网格范围');
            return;
        }
        
        if (params.start_state[0] === params.target_state[0] && 
            params.start_state[1] === params.target_state[1]) {
            alert('起始位置和目标位置不能相同');
            return;
        }
        
        updateControlInfo('正在初始化环境...');
        const response = await fetch('/api/init', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });
        
        if (!response.ok) {
            throw new Error('初始化失败');
        }
        
        envData = await response.json();
        
        // 重置智能体位置和迭代历史
        currentAgentPos = null;
        totalIterations = 0;
        
        // 重置迭代次数输入框
        document.getElementById('iterationInput').value = 1;
        document.getElementById('iterationInput').max = 1;
        document.getElementById('viewIterationBtn').disabled = true;
        updateIterationInfo('运行算法后可查看历史迭代');
        
        initCanvas();
        // 绘制智能体在起始位置
        if (envData.start_state && envData.start_state.length === 2) {
            drawAgent(envData.start_state[0], envData.start_state[1]);
        }
        
        updateControlInfo('环境已初始化');
        document.getElementById('runBtn').disabled = false;
        document.getElementById('resetBtn').disabled = false;
        document.getElementById('prevIterBtn').disabled = true;
        document.getElementById('nextIterBtn').disabled = true;
        currentIteration = 0;
    } catch (error) {
        console.error('初始化失败:', error);
        updateControlInfo('初始化失败: ' + error.message);
    }
}

async function runValueIteration() {
    try {
        const algorithm = document.getElementById('algorithmSelect').value;
        const algorithmName = algorithm === 'policy_iteration' ? '策略迭代' : '值迭代';
        updateControlInfo(`正在运行${algorithmName}算法...`);
        const response = await fetch('/api/run_value_iteration', { method: 'POST' });
        const data = await response.json();
        
        stateValues = data.state_values;
        policy = data.policy;
        totalIterations = data.total_iterations || 0;
        
        // 更新迭代次数输入框的最大值
        const iterationInput = document.getElementById('iterationInput');
        if (totalIterations > 0) {
            iterationInput.max = totalIterations;
            iterationInput.value = totalIterations; // 默认显示最后一次迭代
            currentIteration = totalIterations; // 设置当前迭代为最后一次
            document.getElementById('viewIterationBtn').disabled = false;
            updateIterationInfo(`共 ${totalIterations} 次迭代`);
            // 更新迭代历史导航按钮状态
            updateIterationButtons();
        } else {
            iterationInput.max = 1;
            currentIteration = 0;
            document.getElementById('viewIterationBtn').disabled = true;
            updateIterationInfo('运行算法后可查看历史迭代');
            document.getElementById('prevIterBtn').disabled = true;
            document.getElementById('nextIterBtn').disabled = true;
        }
        
        // 重置智能体位置为起始位置（先清除，让drawGrid可以绘制起始位置标记）
        currentAgentPos = null;
        
        // 绘制网格（包括状态值和策略）
        drawGrid();
        
        // 绘制智能体在起始位置（这会更新currentAgentPos）
        if (envData && envData.start_state && envData.start_state.length === 2) {
            drawAgent(envData.start_state[0], envData.start_state[1]);
        }
        
        updateStateValues(data.state_values);
        // 设置当前迭代为最后一次迭代
        currentIteration = totalIterations;
        updateControlInfo(`${algorithmName}完成！共 ${totalIterations} 次迭代`);
        // 启用迭代历史导航按钮
        updateIterationButtons();
    } catch (error) {
        console.error('算法运行失败:', error);
        updateControlInfo('算法运行失败: ' + error.message);
    }
}

async function resetEnvironment() {
    try {
        const response = await fetch('/api/reset', { method: 'POST' });
        const data = await response.json();
        
        // 重置智能体位置变量
        currentAgentPos = null;
        
        // 重新绘制网格（这会清除画布和所有之前的内容）
        // 注意：drawGrid会检查currentAgentPos，避免在智能体位置绘制起始状态标记
        drawGrid();
        
        // 绘制智能体在起始位置（这会更新currentAgentPos）
        if (data.state && data.state.length === 2) {
            drawAgent(data.state[0], data.state[1]);
        }
        
        // 重置后，如果已经运行过算法，恢复到最后一次迭代
        if (totalIterations > 0) {
            currentIteration = totalIterations;
            document.getElementById('iterationInput').value = totalIterations;
            updateIterationButtons();
        }
        
        updateControlInfo(`环境已重置，当前位置: (${data.state[0]}, ${data.state[1]})`);
    } catch (error) {
        console.error('重置失败:', error);
        updateControlInfo('重置失败: ' + error.message);
    }
}

// 更新迭代历史导航按钮状态
function updateIterationButtons() {
    const prevBtn = document.getElementById('prevIterBtn');
    const nextBtn = document.getElementById('nextIterBtn');
    
    if (totalIterations === 0) {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }
    
    // 上一次迭代按钮：如果当前迭代 > 1，则启用
    prevBtn.disabled = currentIteration <= 1;
    
    // 下一次迭代按钮：如果当前迭代 < 总迭代次数，则启用
    nextBtn.disabled = currentIteration >= totalIterations;
}

// 查看上一次迭代
async function viewPreviousIteration() {
    if (currentIteration > 1) {
        const prevIteration = currentIteration - 1;
        document.getElementById('iterationInput').value = prevIteration;
        await viewIteration();
    }
}

// 查看下一次迭代
async function viewNextIteration() {
    if (currentIteration < totalIterations) {
        const nextIteration = currentIteration + 1;
        document.getElementById('iterationInput').value = nextIteration;
        await viewIteration();
    }
}

// 绘制轨迹
function drawTrajectory(trajectory) {
    if (!trajectory || trajectory.length < 2) return;
    
    const offsetX = 50;
    const offsetY = 50;
    
    ctx.strokeStyle = colors.trajectory;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    trajectory.forEach((point, idx) => {
        const x = offsetX + point[0] * cellSize + cellSize / 2;
        const y = offsetY + point[1] * cellSize + cellSize / 2;
        
        if (idx === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
}

// 更新状态值显示
function updateStateValues(values) {
    const container = document.getElementById('stateValues');
    container.innerHTML = '';
    
    values.forEach((value, idx) => {
        const x = idx % gridWidth;
        const y = Math.floor(idx / gridWidth);
        const item = document.createElement('div');
        item.className = 'value-item';
        item.textContent = `状态(${x},${y}): ${value.toFixed(3)}`;
        container.appendChild(item);
    });
}

// 更新控制信息
function updateControlInfo(message) {
    document.getElementById('controlInfo').innerHTML = `<p>${message}</p>`;
}


// 更新迭代信息显示
function updateIterationInfo(message) {
    const infoDiv = document.getElementById('iterationInfo');
    infoDiv.innerHTML = `<p>${message}</p>`;
}

// 查看指定迭代次数的结果
async function viewIteration() {
    try {
        const iterationNum = parseInt(document.getElementById('iterationInput').value);
        
        if (isNaN(iterationNum) || iterationNum < 1) {
            alert('请输入有效的迭代次数');
            return;
        }
        
        if (totalIterations > 0 && iterationNum > totalIterations) {
            alert(`迭代次数不能超过 ${totalIterations}`);
            return;
        }
        
        updateControlInfo(`正在加载第 ${iterationNum} 次迭代的结果...`);
        
        const response = await fetch('/api/get_iteration', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ iteration: iterationNum })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '获取迭代结果失败');
        }
        
        const data = await response.json();
        
        // 更新状态值和策略
        stateValues = data.state_values;
        policy = data.policy;
        
        // 重置智能体位置为起始位置
        currentAgentPos = null;
        
        // 重新绘制网格
        drawGrid();
        
        // 绘制智能体在起始位置
        if (envData && envData.start_state && envData.start_state.length === 2) {
            drawAgent(envData.start_state[0], envData.start_state[1]);
        }
        
        // 更新状态值显示
        updateStateValues(data.state_values);
        
        // 更新当前迭代次数
        currentIteration = iterationNum;
        document.getElementById('iterationInput').value = iterationNum;
        
        updateControlInfo(`显示第 ${iterationNum} 次迭代的结果`);
        updateIterationInfo(`当前显示: 第 ${iterationNum} 次迭代 / 共 ${totalIterations} 次`);
        
        // 更新按钮状态
        updateIterationButtons();
    } catch (error) {
        console.error('查看迭代结果失败:', error);
        alert('查看迭代结果失败: ' + error.message);
        updateControlInfo('查看迭代结果失败: ' + error.message);
    }
}

// 事件监听
document.getElementById('initBtn').addEventListener('click', initEnvironment);
document.getElementById('runBtn').addEventListener('click', runValueIteration);
document.getElementById('resetBtn').addEventListener('click', resetEnvironment);
document.getElementById('prevIterBtn').addEventListener('click', viewPreviousIteration);
document.getElementById('nextIterBtn').addEventListener('click', viewNextIteration);
document.getElementById('addForbiddenBtn').addEventListener('click', addForbiddenState);
document.getElementById('viewIterationBtn').addEventListener('click', viewIteration);

// 监听网格大小变化，更新输入框限制
document.getElementById('gridWidth').addEventListener('change', updateInputLimits);
document.getElementById('gridHeight').addEventListener('change', updateInputLimits);

// 监听迭代次数输入框，支持回车键
document.getElementById('iterationInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        viewIteration();
    }
});

// 初始化
initCanvas();
renderForbiddenStates();
updateInputLimits();

