import copy
import random
import numpy as np
from grid_world import GridWorld
from value_iteration import PolicyIteration


class MonteCarloBasic(PolicyIteration):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.epsilon = 0.3

    def iteration(self):
        self.iteration_history = []

        # k 次迭代
        for iter_num in range(self.max_iterations):
            print(f"Iteration {iter_num} of {self.max_iterations}")
            old_state_values = copy.deepcopy(self.state_values)

            # 估计值
            for state in range(self.env.num_states):
                print(f"Estimating state {state} of {self.env.num_states}")
                for action in range(self.env.num_actions):
                    print(f"Estimating action {action} of {self.env.num_actions}")
                    # 采样从 (s, a) 出发的多个 episode
                    q_value = self.sample_episode(state, action, num_samples=10)
                    self.action_values[state][action] = q_value

                self.state_values[state] = max(self.action_values[state])

                # policy update
                self.policy_update()

            self.add_iteration_history(
                iter_num + 1, self.state_values, self.policy, self.action_values
            )
            if self.check_state_values_convergence(old_state_values, self.state_values):
                break

    def sample_episode(self, state, action, num_samples):
        """
        采样从 (s, a) 出发的多个 episode, 返回 q(s, a) 的估计值
        """
        q_value = 0.0

        # 采样 num_samples 次
        for _ in range(num_samples):
            # print(f"Sampling episode {_} of {num_samples}")
            current_state = state
            current_action = action
            trajectory = []
            while True:
                next_state, reward = self.env.get_next_state_and_reward(
                    current_state, current_action
                )
                trajectory.append((current_state, reward))
                if next_state == self.env.target_state_idx:
                    break

                current_state = next_state

                if np.random.rand() > self.epsilon:
                    current_action = np.argmax(self.policy[next_state])
                else:
                    current_action = random.randint(0, self.env.num_actions - 1)

            # 计算轨迹的回报
            return_ = 0.0
            for state, reward in reversed(trajectory):
                return_ = return_ * self.gamma + reward
            q_value += return_
        return q_value / num_samples


if __name__ == "__main__":
    env = GridWorld()
    algorithm = MonteCarloBasic(env)
    algorithm.iteration()
    print(algorithm.state_values)
    print(algorithm.policy)
    print(algorithm.action_values)
