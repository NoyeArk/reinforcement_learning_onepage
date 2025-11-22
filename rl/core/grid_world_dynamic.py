"""
动态网格世界环境定义

支持任意大小的网格世界，可以自定义终端状态、障碍物、奖励等
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Set


class GridWorldDynamic:
    """
    动态网格世界环境

    支持任意大小的网格，状态编号从左上角开始，按行优先顺序编号
    """

    def __init__(
        self,
        width: int = 2,
        height: int = 2,
        terminal_states: Optional[List[int]] = None,
        obstacles: Optional[List[int]] = None,
        reward_map: Optional[Dict[int, float]] = None,
        default_reward: float = -0.04,
        terminal_reward: float = 1.0,
    ):
        """
        初始化动态网格世界环境

        Args:
            width: 网格宽度
            height: 网格高度
            terminal_states: 终端状态列表（状态编号）
            obstacles: 障碍物状态列表（状态编号）
            reward_map: 奖励映射 {state: reward}
            default_reward: 默认奖励（每步移动的奖励）
            terminal_reward: 到达终端状态的奖励
        """
        self.width = width
        self.height = height
        self.n_states = width * height
        self.n_actions = 5  # 0: 上, 1: 右, 2: 下, 3: 左, 4: 不动
        self.default_reward = default_reward
        self.terminal_reward = terminal_reward

        # 终端状态集合
        if terminal_states is None:
            # 默认：右下角为终端状态
            self.terminal_states = {self.n_states - 1}
        else:
            self.terminal_states = set(terminal_states)

        # 障碍物集合
        self.obstacles = set(obstacles) if obstacles else set()

        # 奖励映射
        self.reward_map = reward_map if reward_map else {}

        # 构建状态转移概率
        self.P = self._build_transition_model()

        # 生成随机初始策略
        self.initial_policy = self._generate_random_policy()

    def _state_to_pos(self, state: int) -> Tuple[int, int]:
        """将状态编号转换为(行, 列)坐标"""
        row = state // self.width
        col = state % self.width
        return row, col

    def _pos_to_state(self, row: int, col: int) -> int:
        """将(行, 列)坐标转换为状态编号"""
        if 0 <= row < self.height and 0 <= col < self.width:
            return row * self.width + col
        return -1  # 无效位置

    def _build_transition_model(self) -> Dict:
        """构建状态转移模型"""
        P = {}

        for state in range(self.n_states):
            if state in self.obstacles:
                continue  # 障碍物没有转移

            if state in self.terminal_states:
                P[state] = {}  # 终端状态没有出边
                continue

            P[state] = {}
            row, col = self._state_to_pos(state)

            # 定义五个动作：上、右、下、左、不动
            actions = [
                (-1, 0),  # 0: 上
                (0, 1),  # 1: 右
                (1, 0),  # 2: 下
                (0, -1),  # 3: 左
                (0, 0),  # 4: 不动
            ]

            for action_idx, (dr, dc) in enumerate(actions):
                if action_idx == 4:  # 不动动作
                    # 不动动作：停留在当前状态
                    next_state = state
                    # 计算奖励（使用当前状态的奖励）
                    if state in self.terminal_states:
                        reward = self.reward_map.get(state, self.terminal_reward)
                        done = True
                    else:
                        reward = self.reward_map.get(state, self.default_reward)
                        done = False
                else:
                    # 移动动作
                    next_row = row + dr
                    next_col = col + dc
                    next_state = self._pos_to_state(next_row, next_col)

                    # 如果移动会出界或撞到障碍物，停留在原地
                    if next_state == -1 or next_state in self.obstacles:
                        next_state = state

                    # 计算奖励
                    if next_state in self.terminal_states:
                        reward = self.reward_map.get(next_state, self.terminal_reward)
                        done = True
                    else:
                        reward = self.reward_map.get(next_state, self.default_reward)
                        done = False

                P[state][action_idx] = [(1.0, next_state, reward, done)]

        return P

    def _generate_random_policy(self) -> Dict[int, Optional[int]]:
        """
        为每个状态随机生成一个初始动作

        Returns:
            策略字典 {state: action}，终端状态和障碍物的动作为None
        """
        import random

        policy = {}

        for state in range(self.n_states):
            if state in self.terminal_states or state in self.obstacles:
                policy[state] = None
            else:
                # 从可用动作中随机选择一个
                available_actions = self.get_available_actions(state)
                if available_actions:
                    policy[state] = random.choice(available_actions)
                else:
                    policy[state] = None

        return policy

    def get_initial_policy(self) -> Dict[int, Optional[int]]:
        """
        获取初始随机策略

        Returns:
            初始策略字典
        """
        return self.initial_policy.copy()

    def get_transitions(
        self, state: int, action: int
    ) -> List[Tuple[float, int, float, bool]]:
        """
        获取状态-动作的转移概率和奖励

        Args:
            state: 当前状态
            action: 动作

        Returns:
            转移列表，每个元素为 (概率, 下一状态, 奖励, 是否终端)
        """
        if state in self.terminal_states:
            return [(1.0, state, 0, True)]  # 终端状态停留在原地

        if state in self.obstacles:
            return [(1.0, state, 0, False)]  # 障碍物停留在原地

        if state in self.P and action in self.P[state]:
            return self.P[state][action]
        else:
            return [(1.0, state, 0, False)]  # 无效动作，停留在原地

    def get_all_states(self) -> List[int]:
        """获取所有状态"""
        return list(range(self.n_states))

    def get_available_actions(self, state: int) -> List[int]:
        """
        获取状态可用的动作

        Args:
            state: 当前状态

        Returns:
            可用动作列表
        """
        if state in self.terminal_states or state in self.obstacles:
            return []
        if state in self.P:
            return list(self.P[state].keys())
        return []

    def is_terminal(self, state: int) -> bool:
        """判断是否为终端状态"""
        return state in self.terminal_states

    def is_obstacle(self, state: int) -> bool:
        """判断是否为障碍物"""
        return state in self.obstacles

    def get_state_name(self, state: int) -> str:
        """获取状态名称"""
        return f"s{state}"

    def get_state_pos(self, state: int) -> Tuple[int, int]:
        """获取状态的(行, 列)坐标"""
        return self._state_to_pos(state)

    def to_dict(self) -> Dict:
        """转换为字典格式，用于JSON序列化"""
        return {
            "width": self.width,
            "height": self.height,
            "n_states": self.n_states,
            "terminal_states": list(self.terminal_states),
            "obstacles": list(self.obstacles),
            "reward_map": self.reward_map,
            "default_reward": self.default_reward,
            "terminal_reward": self.terminal_reward,
            "initial_policy": {str(k): v for k, v in self.initial_policy.items()},
        }
