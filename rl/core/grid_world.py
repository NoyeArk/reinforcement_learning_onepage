"""
网格世界环境定义

根据图片描述，这是一个2x2的网格世界：
- s1: 可以向右（p=0.5, r=-1）或向下（p=0.5, r=0）
- s2: 可以向下（r=1）
- s3: 可以向右（r=1）
- s4: 终端状态（r=1），没有出边
"""

import numpy as np
from typing import Dict, List, Tuple, Optional


class GridWorld:
    """
    2x2网格世界环境

    状态编号：
    0: s1 (左上)
    1: s2 (右上)
    2: s3 (左下)
    3: s4 (右下，终端状态)
    """

    def __init__(self):
        """初始化网格世界环境"""
        self.n_states = 4
        self.n_actions = 5  # 0: 上, 1: 右, 2: 下, 3: 左, 4: 不动
        self.terminal_state = 3  # s4是终端状态

        # 状态转移概率和奖励
        # P[state][action] = [(prob, next_state, reward, done), ...]
        self.P = {
            0: {  # s1
                1: [(0.5, 1, -1, False)],  # 向右到s2，概率0.5，奖励-1
                2: [(0.5, 2, 0, False)],  # 向下到s3，概率0.5，奖励0
                4: [(1.0, 0, 0, False)],  # 不动，停留在s1，奖励0
            },
            1: {  # s2
                2: [(1.0, 3, 1, True)],  # 向下到s4，概率1.0，奖励1，终端
                4: [(1.0, 1, 0, False)],  # 不动，停留在s2，奖励0
            },
            2: {  # s3
                1: [(1.0, 3, 1, True)],  # 向右到s4，概率1.0，奖励1，终端
                4: [(1.0, 2, 0, False)],  # 不动，停留在s3，奖励0
            },
            3: {  # s4 (终端状态)
                # 终端状态没有出边
            },
        }

        # 状态名称映射
        self.state_names = {0: "s1", 1: "s2", 2: "s3", 3: "s4"}

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
        if state == self.terminal_state:
            return [(1.0, state, 0, True)]  # 终端状态停留在原地

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
        if state == self.terminal_state:
            return []
        if state in self.P:
            return list(self.P[state].keys())
        return []

    def is_terminal(self, state: int) -> bool:
        """判断是否为终端状态"""
        return state == self.terminal_state

    def get_state_name(self, state: int) -> str:
        """获取状态名称"""
        return self.state_names.get(state, f"s{state}")
