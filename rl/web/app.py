"""
Flask Web应用 - 网格世界强化学习可视化
"""

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import numpy as np
import sys
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from rl.core import GridWorldDynamic, ValueIteration, PolicyIteration

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)


@app.route("/")
def index():
    """主页"""
    return render_template("index.html")


@app.route("/api/create_env", methods=["POST"])
def create_env():
    """创建网格世界环境"""
    data = request.json
    width = int(data.get("width", 2))
    height = int(data.get("height", 2))
    terminal_states = [int(s) for s in data.get("terminal_states", [])]
    obstacles = [int(s) for s in data.get("obstacles", [])]
    default_reward = float(data.get("default_reward", -0.04))
    terminal_reward = float(data.get("terminal_reward", 1.0))

    # 如果没有指定终端状态，默认使用右下角
    if not terminal_states:
        terminal_states = [width * height - 1]

    try:
        env = GridWorldDynamic(
            width=width,
            height=height,
            terminal_states=terminal_states if terminal_states else None,
            obstacles=obstacles if obstacles else None,
            default_reward=default_reward,
            terminal_reward=terminal_reward,
        )

        # 转换为可序列化的格式
        env_dict = env.to_dict()

        # 添加状态位置信息
        state_positions = {}
        for state in range(env.n_states):
            row, col = env.get_state_pos(state)
            state_positions[str(state)] = {"row": row, "col": col}

        env_dict["state_positions"] = state_positions
        # 初始策略已经在to_dict()中包含

        return jsonify({"success": True, "env": env_dict})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route("/api/solve", methods=["POST"])
def solve():
    """运行强化学习算法"""
    data = request.json
    algorithm = data.get("algorithm", "value_iteration")
    env_config = data.get("env", {})
    gamma = float(data.get("gamma", 0.9))
    theta = float(data.get("theta", 1e-6))
    max_iterations = int(data.get("max_iterations", 1000))
    record_history = data.get("record_history", True)

    try:
        # 创建环境
        env = GridWorldDynamic(
            width=int(env_config.get("width", 2)),
            height=int(env_config.get("height", 2)),
            terminal_states=[int(s) for s in env_config.get("terminal_states", [])],
            obstacles=[int(s) for s in env_config.get("obstacles", [])],
            default_reward=float(env_config.get("default_reward", -0.04)),
            terminal_reward=float(env_config.get("terminal_reward", 1.0)),
        )

        # 运行算法
        if algorithm == "value_iteration":
            solver = ValueIteration(env, gamma=gamma, theta=theta)
            result = solver.solve(
                max_iterations=max_iterations, record_history=record_history
            )
        elif algorithm == "policy_iteration":
            solver = PolicyIteration(env, gamma=gamma, theta=theta)
            result = solver.solve(
                max_iterations=max_iterations, record_history=record_history
            )
        else:
            return jsonify({"success": False, "error": f"未知算法: {algorithm}"}), 400

        # 添加环境信息
        result["env"] = env.to_dict()

        # 添加状态位置信息
        state_positions = {}
        for state in range(env.n_states):
            row, col = env.get_state_pos(state)
            state_positions[str(state)] = {"row": row, "col": col}
        result["env"]["state_positions"] = state_positions

        return jsonify({"success": True, "result": result})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


def main():
    """启动Web服务器"""
    app.run(debug=True, host="0.0.0.0", port=8030)


if __name__ == "__main__":
    main()
