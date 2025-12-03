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

    @abstractmethod
    def iteration(self):
        pass
