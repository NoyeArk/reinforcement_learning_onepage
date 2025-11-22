"""
策略迭代算法（Policy Iteration）

策略迭代通过策略评估和策略改进的交替进行来找到最优策略
"""

import numpy as np
from typing import Dict
from .grid_world import GridWorld
from .grid_world_dynamic import GridWorldDynamic


class PolicyIteration:
    """
    策略迭代算法

    通过策略评估和策略改进的交替进行来找到最优策略
    """

    def __init__(self, env, gamma: float = 0.9, theta: float = 1e-6):
        """
        初始化策略迭代算法

        Args:
            env: 网格世界环境
            gamma: 折扣因子
            theta: 收敛阈值
        """
        self.env = env
        self.gamma = gamma
        self.theta = theta
        self.V = np.zeros(env.n_states)  # 值函数
        # 初始化随机策略
        self.policy = {}
        for state in env.get_all_states():
            if env.is_terminal(state):
                self.policy[state] = None
            else:
                actions = env.get_available_actions(state)
                if actions:
                    self.policy[state] = actions[0]  # 初始策略：选择第一个可用动作

    def policy_evaluation(self) -> int:
        """
        策略评估：计算当前策略的值函数

        Returns:
            迭代次数
        """
        iteration = 0

        while True:
            V_new = np.zeros(self.env.n_states)

            for state in self.env.get_all_states():
                if self.env.is_terminal(state):
                    V_new[state] = 0
                    continue

                if self.policy[state] is None:
                    continue

                action = self.policy[state]
                action_value = 0
                transitions = self.env.get_transitions(state, action)
                for prob, next_state, reward, done in transitions:
                    if done:
                        action_value += prob * reward
                    else:
                        action_value += prob * (
                            reward + self.gamma * self.V[next_state]
                        )

                V_new[state] = action_value

            delta = np.max(np.abs(V_new - self.V))
            self.V = V_new
            iteration += 1

            if delta < self.theta:
                break

        return iteration

    def policy_improvement(self) -> bool:
        """
        策略改进：根据当前值函数改进策略

        Returns:
            策略是否稳定（是否发生变化）
        """
        policy_stable = True

        for state in self.env.get_all_states():
            if self.env.is_terminal(state):
                continue

            old_action = self.policy[state]

            # 找到最优动作
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

            if old_action != best_action:
                policy_stable = False

        return policy_stable

    def solve(self, max_iterations: int = 100, record_history: bool = False) -> Dict:
        """
        求解最优策略

        Args:
            max_iterations: 最大迭代次数
            record_history: 是否记录迭代历史

        Returns:
            包含值函数、策略和迭代次数的字典
        """
        policy_iteration = 0
        history = [] if record_history else None

        for i in range(max_iterations):
            # 策略评估
            eval_iterations = self.policy_evaluation()

            # 策略改进
            policy_stable = self.policy_improvement()
            policy_iteration = i + 1

            if record_history:
                history.append(
                    {
                        "iteration": policy_iteration,
                        "V": self.V.copy().tolist(),
                        "policy": {str(k): v for k, v in self.policy.items()},
                        "policy_stable": policy_stable,
                    }
                )

            if policy_stable:
                break

        result = {
            "V": self.V.copy().tolist(),
            "policy": {str(k): v for k, v in self.policy.items()},
            "iterations": policy_iteration,
        }

        if record_history:
            result["history"] = history

        return result
