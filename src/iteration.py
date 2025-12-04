import copy
from abc import abstractmethod


class Iteration:
    def __init__(self, env, theta=0.0001, gamma=0.9, max_iterations=1000):
        self.env = env
        self.theta = theta
        self.gamma = gamma
        self.max_iterations = max_iterations
        self.state_values = [0] * env.num_states
        self.action_values = [[0] * env.num_actions for _ in range(env.num_states)]
        self.policy = [[0] * env.num_actions for _ in range(env.num_states)]
        self.iteration_history = []  # 保存每次迭代的状态值和策略

    def add_iteration_history(
        self, iteration: int, state_values: list, policy: list, action_values: list
    ):
        self.iteration_history.append(
            dict(
                iteration=iteration,
                state_values=copy.deepcopy(state_values),
                policy=copy.deepcopy(policy),
                action_values=copy.deepcopy(action_values),
            )
        )

    def check_state_values_convergence(
        self, old_state_values: list, new_state_values: list
    ):
        """
        Check if the state values are converged.
        """
        for i in range(len(old_state_values)):
            if abs(old_state_values[i] - new_state_values[i]) > self.theta:
                return False
        return True

    def check_policy_convergence(self, old_policy: list, new_policy: list):
        """
        Check if the policy is converged.
        """
        for i in range(len(old_policy)):
            if old_policy[i] != new_policy[i]:
                return False
        return True

    @abstractmethod
    def iteration(self):
        pass
