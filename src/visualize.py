import sys

sys.path.append("..")
import numpy as np
from grid_world import GridWorld
from value_iteration import ValueIteration


def visualize_value_iteration():
    """可视化值迭代算法的结果"""
    # 创建环境
    env = GridWorld()

    # 创建值迭代算法
    vi = ValueIteration(env, theta=0.001, gamma=0.9, max_iterations=100)

    # 运行值迭代（临时禁用打印）
    print("开始值迭代...")
    from io import StringIO

    # 捕获前几次迭代的输出
    old_stdout = sys.stdout
    sys.stdout = StringIO()

    try:
        vi.value_iteration()
    finally:
        output = sys.stdout.getvalue()
        sys.stdout = old_stdout

    # 只显示最后几次迭代
    lines = output.split("\n")
    print("值迭代完成！最后几次迭代结果：")
    for line in lines[-20:]:  # 显示最后20行
        if line.strip():
            print(line)

    # 初始化可视化
    print("\n初始化可视化环境...")
    env.render()

    # 添加策略可视化
    print("添加策略可视化（绿色箭头表示最优动作）...")
    policy_matrix = np.array(vi.policy)
    env.add_policy(policy_matrix)

    # 添加状态值可视化
    print("添加状态值可视化（每个格子中的数字表示状态值）...")
    env.add_state_values(vi.state_values, precision=2)

    # 显示最终结果
    print("\n显示最终结果（策略和状态值）...")
    env.render(animation_interval=1)

    # 使用最优策略运行一个episode
    print("\n使用最优策略运行一个episode...")
    state = env.reset()
    env.render()

    for step in range(50):  # 最多50步
        # 获取当前状态的最优动作
        state_idx = env.xy_to_state_idx(state[0], state[1])
        best_action_idx = np.argmax(vi.policy[state_idx])
        action = env.action_space[best_action_idx]

        # 执行动作
        next_state, reward, done, info = env.step(action)
        env.render(animation_interval=0.3)

        print(
            f"Step {step+1}: State {state} -> Action {action} -> State {next_state}, Reward: {reward}, Done: {done}"
        )

        if done:
            print(f"\n✓ 到达目标状态！共用了 {step + 1} 步")
            break

        state = next_state

    # 保持窗口打开
    print("\n可视化完成！")
    input("按 Enter 关闭窗口...")


if __name__ == "__main__":
    visualize_value_iteration()
