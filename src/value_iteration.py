import copy
import random
from iteration import Iteration


class ValueIteration(Iteration):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.current_iteration_num = 0  # 当前迭代次数

    def step_iteration(self):
        """
        执行一次迭代

        Returns:
            converged (bool): 是否收敛
        """
        # 如果是第一次迭代，清空历史记录
        if self.current_iteration_num == 0:
            self.iteration_history = []

        # 检查是否超过最大迭代次数
        if self.current_iteration_num >= self.max_iterations:
            return True

        # 计算每个 (s, a) 的 action value
        for state in range(self.env.num_states):
            for action in range(self.env.num_actions):
                next_state, reward = self.env.get_next_state_and_reward(state, action)
                # qk(s, a) = r(s, a) + gamma * V(s')
                q_value = reward + self.gamma * self.state_values[next_state]
                self.action_values[state][action] = q_value

        old_state_values = copy.deepcopy(self.state_values)

        # policy update
        self.policy_update()

        # value update
        self.state_values = [max(action_values) for action_values in self.action_values]

        # 增加迭代次数
        self.current_iteration_num += 1

        # 保存当前迭代的状态值和策略
        self.add_iteration_history(
            self.current_iteration_num,
            self.state_values,
            self.policy,
            self.action_values,
        )

        # 检查是否收敛
        converged = self.check_state_values_convergence(
            old_state_values, self.state_values
        )
        return converged

    def iteration(self):
        """
        1. 计算每个 (s, a) 的 action vlaue
        2. policy update: 在一个state下, 选择 action value 最大的 action
        3. value update
        """
        # 重置迭代次数
        self.current_iteration_num = 0
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
            old_state_values = copy.deepcopy(self.state_values)

            # policy update
            self.policy_update()

            # value update
            self.state_values = [
                max(action_values) for action_values in self.action_values
            ]

            # 增加迭代次数
            self.current_iteration_num += 1

            # 保存当前迭代的状态值和策略
            self.add_iteration_history(
                self.current_iteration_num,
                self.state_values,
                self.policy,
                self.action_values,
            )

            if self.check_state_values_convergence(old_state_values, self.state_values):
                break


class PolicyIteration(Iteration):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.current_iteration_num = 0  # 当前迭代次数

    def step_iteration(self):
        """
        执行一次迭代

        Returns:
            converged (bool): 是否收敛
        """
        # 如果是第一次迭代，清空历史记录
        if self.current_iteration_num == 0:
            self.iteration_history = []

        # 检查是否超过最大迭代次数
        if self.current_iteration_num >= self.max_iterations:
            return True

        old_state_values = copy.deepcopy(self.state_values)

        # 策略评估
        self.policy_evaluation()

        # 策略改进
        self.policy_improvement()

        # 增加迭代次数
        self.current_iteration_num += 1

        # 保存当前迭代的状态值和策略
        self.add_iteration_history(
            self.current_iteration_num,
            self.state_values,
            self.policy,
            self.action_values,
        )

        # 检查策略是否改变
        converged = self.check_policy_convergence(old_state_values, self.state_values)
        return converged

    def iteration(self):
        # 重置迭代次数
        self.current_iteration_num = 0
        self.iteration_history = []

        for iter_num in range(self.max_iterations):
            old_state_values = copy.deepcopy(self.state_values)

            # 策略评估
            self.policy_evaluation()

            # 策略改进
            self.policy_improvement()

            # 增加迭代次数
            self.current_iteration_num += 1

            # 保存当前迭代的状态值和策略
            self.add_iteration_history(
                self.current_iteration_num,
                self.state_values,
                self.policy,
                self.action_values,
            )

            # 检查策略是否改变
            if self.check_policy_convergence(old_state_values, self.state_values):
                break

    def policy_evaluation(self):
        while True:
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

            if self.check_state_values_convergence(state_values_, self.state_values):
                break

    def policy_improvement(self):
        # 计算所有状态-动作对的Q值
        for state in range(self.env.num_states):
            for action in range(self.env.num_actions):
                next_state, reward = self.env.get_next_state_and_reward(state, action)
                q_value = reward + self.gamma * self.state_values[next_state]
                self.action_values[state][action] = q_value

        # 策略更新：对每个状态，选择Q值最大的动作
        self.policy_update()


class TruncatedPolicyIteration(PolicyIteration):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.truncated_iterations = 100

    def policy_evaluation(self):
        for _ in range(self.truncated_iterations):
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

            if self.check_state_values_convergence(state_values_, self.state_values):
                break
