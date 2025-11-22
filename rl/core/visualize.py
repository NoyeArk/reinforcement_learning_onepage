"""
可视化网格世界和策略
"""

import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
from typing import Dict, Optional
from .grid_world import GridWorld

# 设置中文字体
plt.rcParams["font.sans-serif"] = ["Arial Unicode MS", "SimHei", "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False


def visualize_grid_world(
    env: GridWorld,
    V: Optional[np.ndarray] = None,
    policy: Optional[Dict] = None,
    title: str = "网格世界",
):
    """
    可视化网格世界、值函数和策略

    Args:
        env: 网格世界环境
        V: 值函数数组
        policy: 策略字典
        title: 图表标题
    """
    fig, ax = plt.subplots(1, 1, figsize=(8, 8))

    # 定义网格布局（2x2）
    grid_size = 2
    cell_size = 1.0

    # 状态位置映射 (行, 列)
    state_positions = {
        0: (0, 0),  # s1: 左上
        1: (0, 1),  # s2: 右上
        2: (1, 0),  # s3: 左下
        3: (1, 1),  # s4: 右下
    }

    # 动作方向映射
    action_directions = {
        0: (0, -0.3),  # 上
        1: (0.3, 0),  # 右
        2: (0, 0.3),  # 下
        3: (-0.3, 0),  # 左
    }

    # 绘制网格
    for state in range(env.n_states):
        row, col = state_positions[state]
        x = col * cell_size
        y = (grid_size - 1 - row) * cell_size

        # 根据状态设置颜色
        if state == 3:  # s4终端状态
            color = "lightblue"
        elif state == 1:  # s2
            color = "orange"
        else:
            color = "white"

        # 绘制单元格
        rect = patches.Rectangle(
            (x, y),
            cell_size,
            cell_size,
            linewidth=2,
            edgecolor="black",
            facecolor=color,
            alpha=0.7,
        )
        ax.add_patch(rect)

        # 显示状态名称
        state_name = env.get_state_name(state)
        ax.text(
            x + cell_size / 2,
            y + cell_size / 2 + 0.3,
            state_name,
            ha="center",
            va="center",
            fontsize=16,
            fontweight="bold",
        )

        # 显示值函数
        if V is not None:
            value_text = f"V = {V[state]:.3f}"
            ax.text(
                x + cell_size / 2,
                y + cell_size / 2 - 0.15,
                value_text,
                ha="center",
                va="center",
                fontsize=12,
            )

        # 绘制状态转移（原始环境）
        if state in env.P:
            for action, transitions in env.P[state].items():
                for prob, next_state, reward, done in transitions:
                    next_row, next_col = state_positions[next_state]
                    next_x = next_col * cell_size + cell_size / 2
                    next_y = (grid_size - 1 - next_row) * cell_size + cell_size / 2

                    # 计算箭头起点和终点
                    start_x = x + cell_size / 2
                    start_y = y + cell_size / 2

                    # 根据动作方向调整起点
                    if action in action_directions:
                        dx, dy = action_directions[action]
                        start_x += dx
                        start_y += dy

                    # 绘制箭头
                    arrow = patches.FancyArrowPatch(
                        (start_x, start_y),
                        (next_x, next_y),
                        arrowstyle="->",
                        mutation_scale=20,
                        color="green",
                        linewidth=2,
                        alpha=0.7,
                    )
                    ax.add_patch(arrow)

                    # 显示概率和奖励
                    mid_x = (start_x + next_x) / 2
                    mid_y = (start_y + next_y) / 2
                    label = f"p={prob}, r={reward}"
                    ax.text(
                        mid_x,
                        mid_y + 0.1,
                        label,
                        ha="center",
                        va="bottom",
                        fontsize=9,
                        color="red",
                        bbox=dict(
                            boxstyle="round,pad=0.3", facecolor="yellow", alpha=0.5
                        ),
                    )

        # 绘制策略（如果提供）
        if policy is not None and state in policy and policy[state] is not None:
            action = policy[state]
            center_x = x + cell_size / 2
            center_y = y + cell_size / 2

            if action == 4:  # 不动动作
                # 绘制一个圆圈表示停留
                circle = patches.Circle(
                    (center_x, center_y),
                    radius=0.15,
                    color="red",
                    fill=True,
                    linewidth=2,
                    alpha=0.9,
                )
                ax.add_patch(circle)
            elif action in action_directions:
                dx, dy = action_directions[action]
                # 绘制策略箭头（更粗的红色箭头）
                arrow_length = 0.2
                end_x = center_x + dx * arrow_length * 2
                end_y = center_y + dy * arrow_length * 2

                policy_arrow = patches.FancyArrowPatch(
                    (center_x, center_y),
                    (end_x, end_y),
                    arrowstyle="->",
                    mutation_scale=25,
                    color="red",
                    linewidth=3,
                    alpha=0.9,
                )
                ax.add_patch(policy_arrow)

    # 设置坐标轴
    ax.set_xlim(-0.2, grid_size * cell_size + 0.2)
    ax.set_ylim(-0.2, grid_size * cell_size + 0.2)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_title(title, fontsize=16, fontweight="bold", pad=20)

    plt.tight_layout()
    return fig, ax


def print_results(env: GridWorld, V: np.ndarray, policy: Dict, algorithm_name: str):
    """
    打印结果

    Args:
        env: 网格世界环境
        V: 值函数
        policy: 策略
        algorithm_name: 算法名称
    """
    print(f"\n{'='*60}")
    print(f"{algorithm_name} 结果")
    print(f"{'='*60}")

    print("\n值函数:")
    for state in range(env.n_states):
        state_name = env.get_state_name(state)
        print(f"  {state_name}: V = {V[state]:.6f}")

    print("\n最优策略:")
    action_names = {0: "上", 1: "右", 2: "下", 3: "左", 4: "不动"}
    for state in range(env.n_states):
        state_name = env.get_state_name(state)
        if env.is_terminal(state):
            print(f"  {state_name}: 终端状态（无动作）")
        elif state in policy and policy[state] is not None:
            action = policy[state]
            action_name = action_names.get(action, f"动作{action}")
            print(f"  {state_name}: {action_name}")
        else:
            print(f"  {state_name}: 无可用动作")
