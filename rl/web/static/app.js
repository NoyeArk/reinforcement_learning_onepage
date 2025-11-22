// 全局变量
let currentEnv = null;
let currentResult = null;
let currentHistory = [];
let currentIterationIndex = 0;
let animationInterval = null;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 绑定滑块事件
    document.getElementById('gamma').addEventListener('input', function(e) {
        document.getElementById('gammaValue').textContent = parseFloat(e.target.value).toFixed(2);
    });
});

// 创建环境（确保是全局函数）
window.createEnvironment = async function() {
    const width = parseInt(document.getElementById('width').value);
    const height = parseInt(document.getElementById('height').value);
    const defaultReward = parseFloat(document.getElementById('defaultReward').value);
    const terminalReward = parseFloat(document.getElementById('terminalReward').value);

    try {
        const response = await fetch('/api/create_env', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                width,
                height,
                terminal_states: [],
                obstacles: [],
                default_reward: defaultReward,
                terminal_reward: terminalReward,
            }),
        });

        const data = await response.json();
        if (data.success) {
            currentEnv = data.env;
            currentResult = null;
            currentHistory = [];
            currentIterationIndex = 0;
            
            // 调试信息
            console.log('Environment created:', data.env);
            console.log('State positions:', data.env.state_positions);
            console.log('Initial policy:', data.env.initial_policy);
            
            updateStateInfo(data.env);
            // 显示初始策略
            const initialPolicy = data.env.initial_policy ? Object.fromEntries(
                Object.entries(data.env.initial_policy).map(([k, v]) => [parseInt(k), v])
            ) : null;
            drawGrid(data.env, null, initialPolicy, true);
            document.getElementById('stateInfo').innerHTML = `
                <p><strong>状态数:</strong> ${data.env.n_states}</p>
                <p><strong>终端状态:</strong> ${data.env.terminal_states.join(', ')}</p>
                <p><strong>障碍物:</strong> ${data.env.obstacles.length > 0 ? data.env.obstacles.join(', ') : '无'}</p>
                <p><strong>初始策略:</strong> 已随机生成（见网格中的蓝色箭头）</p>
            `;
            document.getElementById('canvasTitle').textContent = '网格世界环境（初始随机策略）';
        } else {
            alert('创建环境失败: ' + data.error);
        }
    } catch (error) {
        alert('错误: ' + error.message);
    }
}

// 运行算法（确保是全局函数）
window.runAlgorithm = async function() {
    if (!currentEnv) {
        alert('请先创建环境！');
        return;
    }

    const algorithm = document.getElementById('algorithm').value;
    const gamma = parseFloat(document.getElementById('gamma').value);
    const theta = parseFloat(document.getElementById('theta').value);
    const maxIterations = parseInt(document.getElementById('maxIterations').value);

    try {
        const response = await fetch('/api/solve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                algorithm,
                env: currentEnv,
                gamma,
                theta,
                max_iterations: maxIterations,
                record_history: true,
            }),
        });

        const data = await response.json();
        if (data.success) {
            currentResult = data.result;
            currentHistory = data.result.history || [];
            currentIterationIndex = currentHistory.length > 0 ? currentHistory.length - 1 : 0;
            
            updateControls();
            const policy = currentResult.policy ? Object.fromEntries(
                Object.entries(currentResult.policy).map(([k, v]) => [parseInt(k), v])
            ) : null;
            drawGrid(currentEnv, currentResult.V, policy, false);
            updateIterationInfo(currentResult);
            
            // 如果有历史记录，显示最后一次迭代
            if (currentHistory.length > 0) {
                showIteration(currentIterationIndex);
            }
        } else {
            alert('运行算法失败: ' + data.error);
        }
    } catch (error) {
        alert('错误: ' + error.message);
    }
}

// 绘制网格
function drawGrid(env, V = null, policy = null, isInitialPolicy = false) {
    const canvas = document.getElementById('gridCanvas');
    const ctx = canvas.getContext('2d');
    const width = parseInt(env.width);
    const height = parseInt(env.height);
    
    // 动态调整Canvas大小，确保每个单元格至少80x80像素
    const minCellSize = 80;
    const canvasWidth = Math.max(400, width * minCellSize);
    const canvasHeight = Math.max(400, height * minCellSize);
    
    // 设置Canvas的实际像素大小
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // 确保CSS样式不会限制Canvas显示
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    
    console.log(`Canvas size: ${canvasWidth}x${canvasHeight}, cell size: ${canvasWidth/width}x${canvasHeight/height}`);
    
    // 计算单元格大小
    const cellWidth = canvas.width / width;
    const cellHeight = canvas.height / height;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 计算值函数的范围（用于颜色映射）
    let minV = 0, maxV = 0;
    if (V) {
        minV = Math.min(...V);
        maxV = Math.max(...V);
    }
    
    // 绘制每个单元格
    console.log(`Drawing grid: ${width}x${height}, total states: ${env.n_states}`);
    let drawnCount = 0;
    for (let state = 0; state < env.n_states; state++) {
        try {
            // 计算状态位置：优先使用state_positions，否则根据状态编号计算
            let row, col;
            if (env.state_positions && env.state_positions[String(state)]) {
                const pos = env.state_positions[String(state)];
                row = parseInt(pos.row);
                col = parseInt(pos.col);
            } else {
                // 回退：根据状态编号计算位置（行优先）
                row = Math.floor(state / width);
                col = state % width;
            }
            
            const x = col * cellWidth;
            const y = row * cellHeight;
            
            // 确保坐标在Canvas范围内
            if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
                console.warn(`State ${state} out of bounds: x=${x}, y=${y}`);
                continue;
            }
        
        // 确定单元格颜色
        let color = '#ffffff';
        // terminal_states和obstacles可能是数字数组或字符串数组
        const stateStr = String(state);
        const terminalStates = env.terminal_states.map(s => String(s));
        const obstacles = env.obstacles ? env.obstacles.map(s => String(s)) : [];
        
        if (terminalStates.includes(stateStr)) {
            color = '#4CAF50'; // 绿色 - 终端状态
        } else if (obstacles.includes(stateStr)) {
            color = '#757575'; // 灰色 - 障碍物
        } else if (V) {
            // 根据值函数着色
            const normalized = (V[state] - minV) / (maxV - minV || 1);
            const r = Math.floor(100 + normalized * 155);
            const g = Math.floor(200 + normalized * 55);
            const b = Math.floor(255);
            color = `rgb(${r}, ${g}, ${b})`;
        }
        
        // 绘制单元格
        ctx.fillStyle = color;
        ctx.fillRect(x, y, cellWidth, cellHeight);
        
        // 绘制边框
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, cellWidth, cellHeight);
        
        // 绘制状态编号
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`S${state}`, x + cellWidth / 2, y + cellHeight / 2 - 20);
        
        // 绘制值函数
        if (V) {
            ctx.fillStyle = '#000';
            ctx.font = '14px Arial';
            ctx.fillText(V[state].toFixed(3), x + cellWidth / 2, y + cellHeight / 2 + 5);
        }
        
        // 绘制策略箭头
        // policy的key可能是字符串或数字，需要检查两种格式
        const action = policy ? (policy[state] !== undefined ? policy[state] : policy[String(state)]) : null;
        if (action !== null && action !== undefined) {
            const centerX = x + cellWidth / 2;
            const centerY = y + cellHeight / 2;
            
            // 初始策略使用蓝色，最优策略使用红色
            const color = isInitialPolicy ? '#0066FF' : '#FF0000';
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = isInitialPolicy ? 2 : 3;
            
            const arrowLength = Math.min(cellWidth, cellHeight) * 0.3;
            let endX = centerX;
            let endY = centerY;
            
            // 0: 上, 1: 右, 2: 下, 3: 左, 4: 不动
            switch (action) {
                case 0: endY -= arrowLength; break;
                case 1: endX += arrowLength; break;
                case 2: endY += arrowLength; break;
                case 3: endX -= arrowLength; break;
                case 4: 
                    // 不动动作：绘制一个圆圈表示停留
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, arrowLength * 0.5, 0, 2 * Math.PI);
                    ctx.fill();
                    break; // 不动动作不需要箭头，跳出switch
            }
            
            // 如果不是不动动作，继续绘制箭头
            if (action !== 4) {
            
            // 绘制箭头
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // 绘制箭头头部
            const angle = Math.atan2(endY - centerY, endX - centerX);
            const arrowHeadLength = 8;
            const arrowHeadAngle = Math.PI / 6;
            
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(
                endX - arrowHeadLength * Math.cos(angle - arrowHeadAngle),
                endY - arrowHeadLength * Math.sin(angle - arrowHeadAngle)
            );
            ctx.moveTo(endX, endY);
            ctx.lineTo(
                endX - arrowHeadLength * Math.cos(angle + arrowHeadAngle),
                endY - arrowHeadLength * Math.sin(angle + arrowHeadAngle)
            );
            ctx.stroke();
            }
        }
        
        drawnCount++;
    }
    console.log(`Drawn ${drawnCount} out of ${env.n_states} states`);
}

// 更新控制按钮
function updateControls() {
    const hasHistory = currentHistory.length > 0;
    document.getElementById('prevBtn').disabled = !hasHistory || currentIterationIndex <= 0;
    document.getElementById('nextBtn').disabled = !hasHistory || currentIterationIndex >= currentHistory.length - 1;
    
    const slider = document.getElementById('iterationSlider');
    slider.max = Math.max(0, currentHistory.length - 1);
    slider.value = currentIterationIndex;
    document.getElementById('currentIteration').textContent = 
        `${currentIterationIndex + 1}/${currentHistory.length}`;
}

// 上一步迭代（确保是全局函数）
window.previousIteration = function() {
    if (currentIterationIndex > 0) {
        currentIterationIndex--;
        showIteration(currentIterationIndex);
    }
}

// 下一步迭代（确保是全局函数）
window.nextIteration = function() {
    if (currentIterationIndex < currentHistory.length - 1) {
        currentIterationIndex++;
        showIteration(currentIterationIndex);
    }
}

// 跳转到指定迭代（确保是全局函数）
window.goToIteration = function(index) {
    currentIterationIndex = parseInt(index);
    showIteration(currentIterationIndex);
}

// 显示指定迭代
function showIteration(index) {
    if (!currentHistory || index < 0 || index >= currentHistory.length) {
        return;
    }
    
    const iteration = currentHistory[index];
    const policy = iteration.policy ? Object.fromEntries(
        Object.entries(iteration.policy).map(([k, v]) => [parseInt(k), v])
    ) : null;
    drawGrid(currentEnv, iteration.V, policy, false);
    updateControls();
    
    document.getElementById('iterCount').textContent = iteration.iteration;
    if (iteration.delta !== undefined) {
        document.getElementById('maxDelta').textContent = iteration.delta.toFixed(6);
    }
    document.getElementById('iterationInfo').style.display = 'block';
}

// 更新迭代信息
function updateIterationInfo(result) {
    document.getElementById('iterCount').textContent = result.iterations;
    document.getElementById('iterationInfo').style.display = 'block';
    document.getElementById('canvasTitle').textContent = 
        document.getElementById('algorithm').value === 'value_iteration' 
            ? '值迭代算法结果' 
            : '策略迭代算法结果';
}

// 更新状态信息
function updateStateInfo(env) {
    // 状态信息已在createEnvironment中更新
}

// 播放动画（确保是全局函数）
window.animateIterations = function() {
    const btn = document.getElementById('animateBtn');
    
    if (animationInterval) {
        // 停止动画
        clearInterval(animationInterval);
        animationInterval = null;
        btn.textContent = '播放动画';
        return;
    }
    
    if (!currentHistory || currentHistory.length === 0) {
        alert('没有迭代历史可播放！');
        return;
    }
    
    // 开始动画
    btn.textContent = '停止动画';
    currentIterationIndex = 0;
    
    animationInterval = setInterval(() => {
        if (currentIterationIndex < currentHistory.length - 1) {
            currentIterationIndex++;
            showIteration(currentIterationIndex);
        } else {
            clearInterval(animationInterval);
            animationInterval = null;
            btn.textContent = '播放动画';
        }
    }, 500); // 每500ms切换一次
}

