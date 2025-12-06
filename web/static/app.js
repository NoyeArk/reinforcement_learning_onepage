// 全局变量
let envData = null;
let stateValues = null;
let policy = null;
let actionValues = null; // 存储action_values
let canvas, ctx;
let cellSize = 80;
let gridWidth = 5;
let gridHeight = 5;
let isAutoPlaying = false;
let autoPlayInterval = null;
let isSimulating = false; // 是否正在模拟策略移动
let forbiddenStates = [[2, 1], [3, 3], [1, 3]]; // 默认禁止状态
let currentAgentPos = null; // 当前智能体位置
let totalIterations = 0; // 总迭代次数
let currentIteration = 0; // 当前查看的迭代次数
let algorithm = null; // 存储算法实例的引用（用于模拟）
let tooltip = null; // 工具提示框元素

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
    
    // 确保工具提示框已创建
    initTooltip();
    
    // 添加鼠标事件监听（避免重复添加）
    canvas.removeEventListener('mousemove', handleCanvasMouseMove);
    canvas.removeEventListener('mouseleave', handleCanvasMouseLeave);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    canvas.addEventListener('mouseleave', handleCanvasMouseLeave);
    
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
        
        // 停止模拟（如果正在运行）
        stopSimulation();
        
        // 清空所有状态和value信息
        envData = null;
        stateValues = null;
        policy = null;
        actionValues = null;
        currentAgentPos = null;
        totalIterations = 0;
        currentIteration = 0;
        
        // 重置迭代次数输入框
        document.getElementById('iterationInput').value = 1;
        document.getElementById('iterationInput').max = 1;
        document.getElementById('viewIterationBtn').disabled = true;
        updateIterationInfo('运行算法后可查看历史迭代');
        
        // 禁用所有相关按钮
        document.getElementById('runBtn').disabled = true;
        document.getElementById('stepIterBtn').disabled = true;
        document.getElementById('prevIterBtn').disabled = true;
        document.getElementById('nextIterBtn').disabled = true;
        document.getElementById('simulateBtn').disabled = true;
        document.getElementById('stepSimBtn').disabled = true;
        
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
        
        // 获取初始策略和状态值
        if (envData.state_values && envData.policy) {
            stateValues = envData.state_values;
            policy = envData.policy;
            actionValues = envData.action_values || null;
        }
        
        // 重新初始化画布
        initCanvas();
        
        // 绘制网格（包括状态值和策略）
        drawGrid();
        
        // 绘制智能体在起始位置（这会更新currentAgentPos）
        if (envData.start_state && envData.start_state.length === 2) {
            drawAgent(envData.start_state[0], envData.start_state[1]);
        }
        
        // 更新状态值显示
        if (stateValues) {
            updateStateValues(stateValues);
        }
        
        updateControlInfo('环境已初始化，已显示初始策略');
        document.getElementById('runBtn').disabled = false;
        document.getElementById('stepIterBtn').disabled = false;
    } catch (error) {
        console.error('初始化失败:', error);
        updateControlInfo('初始化失败: ' + error.message);
    }
}

async function runValueIteration() {
    try {
        const algorithm = document.getElementById('algorithmSelect').value;
        let algorithmName = '值迭代';
        if (algorithm === 'policy_iteration') {
            algorithmName = '策略迭代';
        } else if (algorithm === 'truncated_policy_iteration') {
            algorithmName = '截断策略迭代';
        } else if (algorithm === 'monte_carlo') {
            algorithmName = '蒙特卡洛方法';
        }
        updateControlInfo(`正在运行${algorithmName}算法...`);
        const response = await fetch('/api/run_value_iteration', { method: 'POST' });
        const data = await response.json();
        
        stateValues = data.state_values;
        policy = data.policy;
        actionValues = data.action_values || null;
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
        // 启用迭代历史导航按钮和模拟按钮
        updateIterationButtons();
        // 运行算法完成后，禁用迭代一次按钮（因为已经运行到收敛）
        document.getElementById('stepIterBtn').disabled = true;
        document.getElementById('simulateBtn').disabled = false;
        document.getElementById('stepSimBtn').disabled = false;
    } catch (error) {
        console.error('算法运行失败:', error);
        updateControlInfo('算法运行失败: ' + error.message);
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

// 执行一次迭代
async function stepIteration() {
    try {
        const algorithm = document.getElementById('algorithmSelect').value;
        let algorithmName = '值迭代';
        if (algorithm === 'policy_iteration') {
            algorithmName = '策略迭代';
        } else if (algorithm === 'truncated_policy_iteration') {
            algorithmName = '截断策略迭代';
        } else if (algorithm === 'monte_carlo') {
            algorithmName = '蒙特卡洛方法';
        }
        
        updateControlInfo(`正在执行${algorithmName}的一次迭代...`);
        const response = await fetch('/api/step_iteration', { method: 'POST' });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '迭代失败');
        }
        
        const data = await response.json();
        
        stateValues = data.state_values;
        policy = data.policy;
        actionValues = data.action_values || null;
        totalIterations = data.total_iterations || 0;
        currentIteration = data.current_iteration || 0;
        
        // 更新迭代次数输入框的最大值
        const iterationInput = document.getElementById('iterationInput');
        if (totalIterations > 0) {
            iterationInput.max = totalIterations;
            iterationInput.value = currentIteration; // 显示当前迭代
            document.getElementById('viewIterationBtn').disabled = false;
            updateIterationInfo(`当前迭代: ${currentIteration} / 共 ${totalIterations} 次`);
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
        
        // 如果收敛，禁用迭代一次按钮
        if (data.converged) {
            document.getElementById('stepIterBtn').disabled = true;
            updateControlInfo(`${algorithmName}已完成！已收敛，共 ${totalIterations} 次迭代`);
        } else {
            updateControlInfo(`${algorithmName}第 ${currentIteration} 次迭代完成`);
        }
        
        // 启用迭代历史导航按钮和模拟按钮
        updateIterationButtons();
        document.getElementById('simulateBtn').disabled = false;
        document.getElementById('stepSimBtn').disabled = false;
    } catch (error) {
        console.error('迭代失败:', error);
        updateControlInfo('迭代失败: ' + error.message);
    }
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
        actionValues = data.action_values || null;
        
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
        
        // 停止模拟（如果正在运行），因为策略已改变
        stopSimulation();
        
        updateControlInfo(`显示第 ${iterationNum} 次迭代的结果`);
        updateIterationInfo(`当前显示: 第 ${iterationNum} 次迭代 / 共 ${totalIterations} 次`);
        
        // 更新按钮状态
        updateIterationButtons();
        
        // 如果当前迭代次数小于总迭代次数，说明还可以继续迭代
        if (currentIteration < totalIterations) {
            document.getElementById('stepIterBtn').disabled = false;
        } else {
            document.getElementById('stepIterBtn').disabled = true;
        }
    } catch (error) {
        console.error('查看迭代结果失败:', error);
        alert('查看迭代结果失败: ' + error.message);
        updateControlInfo('查看迭代结果失败: ' + error.message);
    }
}

// 执行一步模拟
async function stepSimulation() {
    try {
        // 使用当前查看的迭代的策略
        const iterationToUse = currentIteration > 0 ? currentIteration : totalIterations;
        const response = await fetch('/api/step', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ iteration: iterationToUse })
        });
        const data = await response.json();
        
        drawGrid();
        if (data.trajectory && data.trajectory.length > 0) {
            drawTrajectory(data.trajectory);
        }
        drawAgent(data.state[0], data.state[1]);
        
        const actionNames = { '0,1': 'DOWN', '1,0': 'RIGHT', '0,-1': 'UP', '-1,0': 'LEFT', '0,0': 'STAY' };
        const actionKey = data.action.join(',');
        const actionName = actionNames[actionKey] || actionKey;
        
        updateControlInfo(
            `步骤完成: 动作=${actionName}, 奖励=${data.reward}, ` +
            `位置=(${data.state[0]}, ${data.state[1]}), ` +
            `完成=${data.done ? '是' : '否'}`
        );
        
        if (data.done) {
            stopSimulation();
            updateControlInfo('🎉 到达目标状态！');
        }
    } catch (error) {
        console.error('执行步骤失败:', error);
        updateControlInfo('执行步骤失败: ' + error.message);
    }
}

// 开始/停止模拟策略移动
function startSimulation() {
    if (isSimulating) {
        stopSimulation();
        return;
    }
    
    if (!policy || !stateValues) {
        alert('请先运行算法');
        return;
    }
    
    isSimulating = true;
    document.getElementById('simulateBtn').textContent = '停止模拟';
    document.getElementById('simulateBtn').classList.remove('btn-danger');
    document.getElementById('simulateBtn').classList.add('btn-warning');
    document.getElementById('stepSimBtn').disabled = true;
    
    autoPlayInterval = setInterval(async () => {
        await stepSimulation();
    }, 500);
}

function stopSimulation() {
    isSimulating = false;
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
    }
    document.getElementById('simulateBtn').textContent = '模拟策略';
    document.getElementById('simulateBtn').classList.remove('btn-warning');
    document.getElementById('simulateBtn').classList.add('btn-danger');
    document.getElementById('stepSimBtn').disabled = false;
}

// 事件监听
document.getElementById('initBtn').addEventListener('click', initEnvironment);
document.getElementById('runBtn').addEventListener('click', runValueIteration);
document.getElementById('stepIterBtn').addEventListener('click', stepIteration);
document.getElementById('prevIterBtn').addEventListener('click', viewPreviousIteration);
document.getElementById('nextIterBtn').addEventListener('click', viewNextIteration);
document.getElementById('addForbiddenBtn').addEventListener('click', addForbiddenState);
document.getElementById('viewIterationBtn').addEventListener('click', viewIteration);
document.getElementById('simulateBtn').addEventListener('click', startSimulation);
document.getElementById('stepSimBtn').addEventListener('click', stepSimulation);

// 监听网格大小变化，更新输入框限制
document.getElementById('gridWidth').addEventListener('change', updateInputLimits);
document.getElementById('gridHeight').addEventListener('change', updateInputLimits);

// 监听迭代次数输入框，支持回车键
document.getElementById('iterationInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        viewIteration();
    }
});

// 处理Canvas鼠标移动事件
function handleCanvasMouseMove(event) {
    if (!envData || !actionValues) {
        if (tooltip) {
            tooltip.style.display = 'none';
        }
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const offsetX = 50;
    const offsetY = 50;
    
    // 计算鼠标在canvas中的位置
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // 计算网格坐标
    const gridX = Math.floor((x - offsetX) / cellSize);
    const gridY = Math.floor((y - offsetY) / cellSize);
    
    // 检查是否在有效范围内
    if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
        // 计算状态索引
        const stateIdx = gridY * gridWidth + gridX;
        
        if (stateIdx >= 0 && stateIdx < actionValues.length) {
            // 获取该状态的action_values
            const stateActionValues = actionValues[stateIdx];
            
            // 获取动作名称
            const actionNames = getActionNames();
            
            // 构建提示文本
            let tooltipText = `<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 5px;">状态 (${gridX}, ${gridY})</div>`;
            tooltipText += '<div style="font-size: 11px; margin-bottom: 5px; color: #ccc;">动作值 (Q值):</div>';
            
            stateActionValues.forEach((value, actionIdx) => {
                const actionName = actionNames[actionIdx] || `动作${actionIdx}`;
                const valueColor = value > 0 ? '#4CAF50' : value < 0 ? '#F44336' : '#fff';
                tooltipText += `<div style="margin-top: 4px; display: flex; justify-content: space-between;"><span>${actionName}:</span><span style="color: ${valueColor}; font-weight: bold; margin-left: 10px;">${value.toFixed(3)}</span></div>`;
            });
            
            // 显示工具提示框
            tooltip.innerHTML = tooltipText;
            tooltip.style.display = 'block';
            
            // 计算工具提示框位置，确保不超出屏幕
            const tooltipWidth = 250;
            const tooltipHeight = tooltip.offsetHeight || 200;
            let left = event.clientX + 15;
            let top = event.clientY + 15;
            
            // 如果超出右边界，显示在鼠标左侧
            if (left + tooltipWidth > window.innerWidth) {
                left = event.clientX - tooltipWidth - 15;
            }
            
            // 如果超出下边界，显示在鼠标上方
            if (top + tooltipHeight > window.innerHeight) {
                top = event.clientY - tooltipHeight - 15;
            }
            
            tooltip.style.left = left + 'px';
            tooltip.style.top = top + 'px';
        } else {
            // 超出范围，隐藏工具提示框
            if (tooltip) {
                tooltip.style.display = 'none';
            }
        }
    } else {
        // 超出网格范围，隐藏工具提示框
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }
}

// 处理Canvas鼠标离开事件
function handleCanvasMouseLeave() {
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

// 获取动作名称
function getActionNames() {
    if (!envData || !envData.action_space) {
        return ['DOWN', 'RIGHT', 'UP', 'LEFT', 'STAY'];
    }
    
    const actionNames = [];
    envData.action_space.forEach(action => {
        const [dx, dy] = action;
        if (dx === 0 && dy === 1) {
            actionNames.push('DOWN');
        } else if (dx === 1 && dy === 0) {
            actionNames.push('RIGHT');
        } else if (dx === 0 && dy === -1) {
            actionNames.push('UP');
        } else if (dx === -1 && dy === 0) {
            actionNames.push('LEFT');
        } else if (dx === 0 && dy === 0) {
            actionNames.push('STAY');
        } else {
            actionNames.push(`(${dx},${dy})`);
        }
    });
    
    return actionNames;
}

// 初始化工具提示框（在页面加载时创建）
function initTooltip() {
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'actionValueTooltip';
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 12px;
            pointer-events: none;
            z-index: 1000;
            display: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-width: 250px;
            line-height: 1.5;
        `;
        document.body.appendChild(tooltip);
    }
}

// 初始化
initTooltip();
initCanvas();
renderForbiddenStates();
updateInputLimits();

