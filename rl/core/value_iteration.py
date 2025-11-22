"""
值迭代算法（Value Iteration）

值迭代通过不断更新状态值函数直到收敛来找到最优策略
"""

import numpy as np
from typing import Dict, Tuple
from .grid_world import GridWorld
from .grid_world_dynamic import GridWorldDynamic


class ValueIteration:
    """
    值迭代算法

    通过迭代更新值函数直到收敛，然后从值函数中提取最优策略
    """

    def __init__(self, env, gamma: float = 0.9, theta: float = 1e-6):
        """
        初始化值迭代算法

        Args:
            env: 网格世界环境
            gamma: 折扣因子
            theta: 收敛阈值
        """
        self.env = env
        self.gamma = gamma
        self.theta = theta
        self.V = np.zeros(env.n_states)  # 值函数
        self.policy = {}  # 策略

    def update_value(self) -> float:
        """
        更新一次值函数

        Returns:
            值函数的最大变化量
        """
        V_new = np.zeros(self.env.n_states)

        for state in self.env.get_all_states():
            if self.env.is_terminal(state):
                V_new[state] = 0  # 终端状态值为0
                continue

            # 计算所有动作的期望值
            max_value = float("-inf")
            for action in self.env.get_available_actions(state):
                action_value = 0
                transitions = self.env.get_transitions(state, action)
                for prob, next_state, reward, done in transitions:
                    if done:
                        action_value += prob * reward
                    else:
                        action_value += prob * (
                            reward + self.gamma * self.V[next_state]
                        )
                max_value = max(max_value, action_value)

            V_new[state] = max_value

        delta = np.max(np.abs(V_new - self.V))
        self.V = V_new
        return delta

    def solve(self, max_iterations: int = 1000, record_history: bool = False) -> Dict:
        """
        求解最优值函数和策略

        Args:
            max_iterations: 最大迭代次数
            record_history: 是否记录迭代历史

        Returns:
            包含值函数、策略和迭代次数的字典
        """
        iteration = 0
        history = [] if record_history else None

        for i in range(max_iterations):
            delta = self.update_value()
            iteration = i + 1

            if record_history:
                history.append({
                    "iteration": iteration,
                    "V": self.V.copy().tolist(),
                    "delta": float(delta),
                })

            if delta < self.theta:
                break

        # 从值函数中提取最优策略
        self.extract_policy()

        result = {
            "V": self.V.copy().tolist(),
            "policy": {str(k): v for k, v in self.policy.items()},
            "iterations": iteration,
        }
        
        if record_history:
            result["history"] = history

        return result

    def extract_policy(self):
        """从值函数中提取最优策略"""
        self.policy = {}

        for state in self.env.get_all_states():
            if self.env.is_terminal(state):
                self.policy[state] = None
                continue

            best_action = None
            best_value = float("-inf")

            for action in self.env.get_available_actions(state):
                action_value = 0
                transitions = self.env.get_transitions(state, action)
                for prob, next_state, reward, done in transitions:
                    if done:
                        action_value += prob * reward
                    else:
                        action_value += prob * (
                            reward + self.gamma * self.V[next_state]
                        )

                if action_value > best_value:
                    best_value = action_value
                    best_action = action

            self.policy[state] = best_action
