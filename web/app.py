from flask import Flask, render_template, jsonify, request
import sys
import os

# 添加src目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from grid_world import GridWorld
from value_iteration import ValueIteration, PolicyIteration

app = Flask(__name__)

# 全局变量存储环境和分析器
env = None
algorithm = None  # 存储算法实例（可以是ValueIteration或PolicyIteration）


@app.route("/")
def index():
    """主页面"""
    return render_template("index.html")


@app.route("/api/init", methods=["POST"])
def init_env():
    """初始化环境"""
    global env, algorithm

    # 获取前端传来的参数
    data = request.get_json() or {}

    # 解析参数，提供默认值
    algorithm_type = data.get("algorithm", "value_iteration")
    env_size = tuple(data.get("env_size", [5, 5]))
    start_state = tuple(data.get("start_state", [0, 0]))
    target_state = tuple(data.get("target_state", [4, 4]))
    forbidden_states = [
        tuple(s) for s in data.get("forbidden_states", [[2, 1], [3, 3], [1, 3]])
    ]

    # 创建环境
    env = GridWorld(
        env_size=env_size,
        start_state=start_state,
        target_state=target_state,
        forbidden_states=forbidden_states,
    )

    # 根据算法类型创建对应的算法实例
    if algorithm_type == "policy_iteration":
        algorithm = PolicyIteration(env, theta=0.001, gamma=0.9, max_iterations=100)
    else:  # 默认使用值迭代
        algorithm = ValueIteration(env, theta=0.001, gamma=0.9, max_iterations=100)

    return jsonify(
        {
            "algorithm": algorithm_type,
            "env_size": list(env.env_size),
            "start_state": list(env.start_state),
            "target_state": list(env.target_state),
            "forbidden_states": [list(s) for s in env.forbidden_states],
            "num_states": env.num_states,
            "num_actions": env.num_actions,
            "action_space": [list(a) for a in env.action_space],
        }
    )


@app.route("/api/run_value_iteration", methods=["POST"])
def run_value_iteration():
    """运行迭代算法（值迭代或策略迭代）"""
    global env, algorithm

    if env is None or algorithm is None:
        return jsonify({"error": "Environment not initialized"}), 400

    # 运行迭代算法（捕获输出）
    import io
    import contextlib

    f = io.StringIO()
    with contextlib.redirect_stdout(f):
        algorithm.iteration()

    # 转换策略和状态值为列表格式
    policy_list = []
    for state_idx in range(env.num_states):
        x, y = env.state_idx_to_xy(state_idx)
        # 找到最优动作索引
        best_action_idx = 0
        max_prob = algorithm.policy[state_idx][0]
        for i, prob in enumerate(algorithm.policy[state_idx]):
            if prob > max_prob:
                max_prob = prob
                best_action_idx = i
        policy_list.append(
            {
                "state_idx": state_idx,
                "x": x,
                "y": y,
                "best_action_idx": best_action_idx,
                "action": list(env.action_space[best_action_idx]),
                "policy": algorithm.policy[state_idx],
            }
        )

    # 获取总迭代次数
    total_iterations = (
        len(algorithm.iteration_history)
        if hasattr(algorithm, "iteration_history")
        else 0
    )

    return jsonify(
        {
            "state_values": [float(v) for v in algorithm.state_values],
            "policy": policy_list,
            "action_values": [
                [float(v) for v in row] for row in algorithm.action_values
            ],
            "total_iterations": total_iterations,
        }
    )


@app.route("/api/reset", methods=["POST"])
def reset_env():
    """重置环境"""
    global env

    if env is None:
        return jsonify({"error": "Environment not initialized"}), 400

    state, info = env.reset()
    return jsonify(
        {
            "state": list(state),
            "trajectory": [
                list(t) if isinstance(t, (tuple, list)) else t for t in env.traj
            ],
        }
    )


@app.route("/api/get_iteration", methods=["POST"])
def get_iteration():
    """获取指定迭代次数的结果"""
    global env, algorithm

    if env is None or algorithm is None:
        return jsonify({"error": "Environment not initialized"}), 400

    data = request.get_json() or {}
    iteration_num = data.get("iteration", 1)

    if not hasattr(algorithm, "iteration_history") or not algorithm.iteration_history:
        return jsonify({"error": "Algorithm not run or no history available"}), 400

    # 检查迭代次数是否有效
    if iteration_num < 1 or iteration_num > len(algorithm.iteration_history):
        return (
            jsonify(
                {
                    "error": f"Iteration number must be between 1 and {len(algorithm.iteration_history)}"
                }
            ),
            400,
        )

    # 获取指定迭代次数的数据
    history_item = algorithm.iteration_history[iteration_num - 1]
    state_values = history_item["state_values"]
    policy = history_item["policy"]

    # 转换策略为列表格式
    policy_list = []
    for state_idx in range(env.num_states):
        x, y = env.state_idx_to_xy(state_idx)
        # 找到最优动作索引
        best_action_idx = 0
        max_prob = policy[state_idx][0]
        for i, prob in enumerate(policy[state_idx]):
            if prob > max_prob:
                max_prob = prob
                best_action_idx = i
        policy_list.append(
            {
                "state_idx": state_idx,
                "x": x,
                "y": y,
                "best_action_idx": best_action_idx,
                "action": list(env.action_space[best_action_idx]),
                "policy": policy[state_idx],
            }
        )

    return jsonify(
        {
            "iteration": iteration_num,
            "state_values": [float(v) for v in state_values],
            "policy": policy_list,
            "action_values": [
                [float(v) for v in row] for row in history_item["action_values"]
            ],
        }
    )


@app.route("/api/step", methods=["POST"])
def step_env():
    """执行一步"""
    global env, algorithm

    if env is None:
        return jsonify({"error": "Environment not initialized"}), 400

    # 获取当前状态的最优动作
    state_idx = env.xy_to_state_idx(env.agent_state[0], env.agent_state[1])

    if algorithm is None:
        return jsonify({"error": "Algorithm not run"}), 400

    # 找到最优动作索引
    best_action_idx = 0
    max_prob = algorithm.policy[state_idx][0]
    for i, prob in enumerate(algorithm.policy[state_idx]):
        if prob > max_prob:
            max_prob = prob
            best_action_idx = i
    action = env.action_space[best_action_idx]

    # 执行动作
    next_state, reward, done, info = env.step(action)

    return jsonify(
        {
            "state": list(next_state),
            "action": list(action),
            "reward": float(reward),
            "done": bool(done),
            "trajectory": [
                list(t) if isinstance(t, (tuple, list)) else t for t in env.traj
            ],
        }
    )


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
