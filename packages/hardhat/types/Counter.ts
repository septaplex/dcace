/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import { FunctionFragment, Result, EventFragment } from "@ethersproject/abi";
import { Listener, Provider } from "@ethersproject/providers";
import { TypedEventFilter, TypedEvent, TypedListener, OnEvent } from "./common";

export interface CounterInterface extends utils.Interface {
  functions: {
    "decrement()": FunctionFragment;
    "get()": FunctionFragment;
    "increment()": FunctionFragment;
    "set(int256)": FunctionFragment;
    "throwError()": FunctionFragment;
  };

  encodeFunctionData(functionFragment: "decrement", values?: undefined): string;
  encodeFunctionData(functionFragment: "get", values?: undefined): string;
  encodeFunctionData(functionFragment: "increment", values?: undefined): string;
  encodeFunctionData(functionFragment: "set", values: [BigNumberish]): string;
  encodeFunctionData(
    functionFragment: "throwError",
    values?: undefined
  ): string;

  decodeFunctionResult(functionFragment: "decrement", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "get", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "increment", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "set", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "throwError", data: BytesLike): Result;

  events: {
    "Decrement(int256,int256)": EventFragment;
    "Increment(int256,int256)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "Decrement"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "Increment"): EventFragment;
}

export type DecrementEvent = TypedEvent<
  [BigNumber, BigNumber],
  { oldValue: BigNumber; newValue: BigNumber }
>;

export type DecrementEventFilter = TypedEventFilter<DecrementEvent>;

export type IncrementEvent = TypedEvent<
  [BigNumber, BigNumber],
  { oldValue: BigNumber; newValue: BigNumber }
>;

export type IncrementEventFilter = TypedEventFilter<IncrementEvent>;

export interface Counter extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: CounterInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    decrement(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    get(overrides?: CallOverrides): Promise<[BigNumber]>;

    increment(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    set(
      counter: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    throwError(overrides?: CallOverrides): Promise<[void]>;
  };

  decrement(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  get(overrides?: CallOverrides): Promise<BigNumber>;

  increment(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  set(
    counter: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  throwError(overrides?: CallOverrides): Promise<void>;

  callStatic: {
    decrement(overrides?: CallOverrides): Promise<void>;

    get(overrides?: CallOverrides): Promise<BigNumber>;

    increment(overrides?: CallOverrides): Promise<void>;

    set(counter: BigNumberish, overrides?: CallOverrides): Promise<void>;

    throwError(overrides?: CallOverrides): Promise<void>;
  };

  filters: {
    "Decrement(int256,int256)"(
      oldValue?: BigNumberish | null,
      newValue?: BigNumberish | null
    ): DecrementEventFilter;
    Decrement(
      oldValue?: BigNumberish | null,
      newValue?: BigNumberish | null
    ): DecrementEventFilter;

    "Increment(int256,int256)"(
      oldValue?: BigNumberish | null,
      newValue?: BigNumberish | null
    ): IncrementEventFilter;
    Increment(
      oldValue?: BigNumberish | null,
      newValue?: BigNumberish | null
    ): IncrementEventFilter;
  };

  estimateGas: {
    decrement(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    get(overrides?: CallOverrides): Promise<BigNumber>;

    increment(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    set(
      counter: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    throwError(overrides?: CallOverrides): Promise<BigNumber>;
  };

  populateTransaction: {
    decrement(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    get(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    increment(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    set(
      counter: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    throwError(overrides?: CallOverrides): Promise<PopulatedTransaction>;
  };
}
