import copy
import random
from iteration import Iteration


class ValueIteration(Iteration):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def iteration(self):
        """
        1. 计算每个 (s, a) 的 action vlaue
        2. policy update: 在一个state下, 选择 action value 最大的 action
        3. value update
        """
        # 清空历史记录
        self.iteration_history = []

        for iter_num in range(self.max_iterations):
            for state in range(self.env.num_states):
                for action in range(self.env.num_actions):
                    next_state, reward = self.env.get_next_state_and_reward(
                        state, action
                    )
                    # qk(s, a) = r(s, a) + gamma * V(s')
                    q_value = reward + self.gamma * self.state_values[next_state]
                    self.action_values[state][action] = q_value

            # policy update
            best_actions = [
                max(enumerate(action_values), key=lambda x: x[1])[0]
                for action_values in self.action_values
            ]  # [num_states]
            for state, best_action in enumerate(best_actions):
                self.policy[state] = [
                    1 if a == best_action else 0 for a in range(self.env.num_actions)
                ]

            state_values_ = copy.deepcopy(self.state_values)

            # value update
            self.state_values = [
                max(action_values) for action_values in self.action_values
            ]

            # 保存当前迭代的状态值和策略
            self.iteration_history.append(
                {
                    "iteration": iter_num + 1,
                    "state_values": copy.deepcopy(self.state_values),
                    "policy": copy.deepcopy(self.policy),
                    "action_values": copy.deepcopy(self.action_values),
                }
            )

            if abs(sum(self.state_values) - sum(state_values_)) < self.theta:
                break


class PolicyIteration(Iteration):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def iteration(self):
        # 初始化策略为均匀随机策略
        self.policy = [
            [random.random() for _ in range(self.env.num_actions)]
            for _ in range(self.env.num_states)
        ]

        # 清空历史记录
        self.iteration_history = []

        for iter_num in range(self.max_iterations):
            # 策略评估
            self.policy_evaluation()

            # 策略改进
            old_policy = copy.deepcopy(self.policy)
            self.policy_improvement()

            # 保存当前迭代的状态值和策略
            self.iteration_history.append(
                {
                    "iteration": iter_num + 1,
                    "state_values": copy.deepcopy(self.state_values),
                    "policy": copy.deepcopy(self.policy),
                    "action_values": copy.deepcopy(self.action_values),
                }
            )

            # 检查策略是否改变
            policy_changed = False
            for state in range(self.env.num_states):
                if old_policy[state] != self.policy[state]:
                    policy_changed = True
                    break

            if not policy_changed:
                break

    def policy_evaluation(self):
        for _ in range(self.max_iterations):
            state_values_ = copy.deepcopy(self.state_values)

            for state in range(self.env.num_states):
                # 根据策略的概率分布计算状态值
                # V(s) = sum_a π(a|s) * sum_{s',r} p(s',r|s,a) * [r + gamma * V(s')]
                # 在当前确定性环境中，简化为：
                # V(s) = sum_a π(a|s) * [r(s,a) + gamma * V(s')]
                value = 0.0
                for action in range(self.env.num_actions):
                    next_state, reward = self.env.get_next_state_and_reward(
                        state, action
                    )
                    action_prob = self.policy[state][action]
                    value += action_prob * (
                        reward + self.gamma * self.state_values[next_state]
                    )
                self.state_values[state] = value

            if abs(sum(self.state_values) - sum(state_values_)) < self.theta:
                break

    def policy_improvement(self):
        # 计算所有状态-动作对的Q值
        for state in range(self.env.num_states):
            for action in range(self.env.num_actions):
                next_state, reward = self.env.get_next_state_and_reward(state, action)
                q_value = reward + self.gamma * self.state_values[next_state]
                self.action_values[state][action] = q_value

        # 策略更新：对每个状态，选择Q值最大的动作
        best_actions = [
            max(enumerate(action_values), key=lambda x: x[1])[0]
            for action_values in self.action_values
        ]  # [num_states]
        for state, best_action in enumerate(best_actions):
            self.policy[state] = [
                1 if a == best_action else 0 for a in range(self.env.num_actions)
            ]
